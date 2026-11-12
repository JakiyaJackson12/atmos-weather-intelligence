"""Atmos FastAPI weather proxy with cache and SQLite request observations."""
import json, os, sqlite3, time
from pathlib import Path
from threading import Lock
from urllib.request import Request,urlopen
from urllib.error import HTTPError,URLError
from urllib.parse import urlencode
from fastapi import FastAPI,HTTPException,Query
from fastapi.staticfiles import StaticFiles

DIR=Path(__file__).resolve().parent
FORECAST='https://api.open-meteo.com/v1/forecast'
AIR='https://air-quality-api.open-meteo.com/v1/air-quality'
GEO='https://geocoding-api.open-meteo.com/v1/search'

def remote_json(base,params):
    try:
        with urlopen(Request(base+'?'+urlencode(params),headers={'User-Agent':'Atmos-Educational-Weather-Dashboard/0.2'}),timeout=10) as res: data=json.load(res)
    except (HTTPError,URLError,TimeoutError,ValueError) as exc:
        raise HTTPException(503,'Weather data provider unavailable. Please retry later.') from exc
    if data.get('error'): raise HTTPException(502,'Weather provider returned an error')
    return data

def create_app(serve_frontend=True,db_file=None,provider=remote_json):
    app=FastAPI(title='Atmos Weather Intelligence',version='0.2.0',docs_url='/api/docs')
    database=Path(db_file or os.getenv('ATMOS_DB',str(DIR/'weather_cache.db')))
    database.parent.mkdir(parents=True,exist_ok=True)
    con=sqlite3.connect(database,check_same_thread=False)
    lock=Lock()
    con.execute('CREATE TABLE IF NOT EXISTS requests (id INTEGER PRIMARY KEY, queried_at INTEGER, kind TEXT, latitude REAL, longitude REAL, cache_hit INTEGER)')
    con.commit()
    cache={}

    def cached(key,produce,ttl=600):
        hit=key in cache and time.time()-cache[key]['time']<ttl
        if hit:return cache[key]['data'],True
        data=produce()
        cache[key]={'time':time.time(),'data':data}
        return data,False

    def parse_city_state(query):
        names={
          'al':'Alabama','ak':'Alaska','az':'Arizona','ar':'Arkansas','ca':'California','co':'Colorado','ct':'Connecticut','de':'Delaware','fl':'Florida','ga':'Georgia','hi':'Hawaii','id':'Idaho','il':'Illinois','in':'Indiana','ia':'Iowa','ks':'Kansas','ky':'Kentucky','la':'Louisiana','me':'Maine','md':'Maryland','ma':'Massachusetts','mi':'Michigan','mn':'Minnesota','ms':'Mississippi','mo':'Missouri','mt':'Montana','ne':'Nebraska','nv':'Nevada','nh':'New Hampshire','nj':'New Jersey','nm':'New Mexico','ny':'New York','nc':'North Carolina','nd':'North Dakota','oh':'Ohio','ok':'Oklahoma','or':'Oregon','pa':'Pennsylvania','ri':'Rhode Island','sc':'South Carolina','sd':'South Dakota','tn':'Tennessee','tx':'Texas','ut':'Utah','vt':'Vermont','va':'Virginia','wa':'Washington','wv':'West Virginia','wi':'Wisconsin','wy':'Wyoming','dc':'District of Columbia'
        }
        raw=query.strip()
        if ',' in raw:
            city,state=raw.split(',',1)
            return city.strip(),names.get(state.strip().lower(),state.strip())
        lower=raw.lower()
        for code,fullname in names.items():
            if lower.endswith(' '+code): return raw[:-(len(code)+1)].strip(),fullname
        for fullname in sorted(set(names.values()),key=len,reverse=True):
            if lower.endswith(' '+fullname.lower()): return raw[:-(len(fullname)+1)].strip(),fullname
        return raw,None

    @app.get('/api/health')
    def health(): return {'ok':True,'product':'atmos','backend':'FastAPI/SQLite/cache','source':'Open-Meteo'}

    @app.get('/api/search')
    def search(name:str=Query(min_length=2,max_length=100)):
        city,state=parse_city_state(name)
        if len(city)<2: raise HTTPException(422,'Include a city name.')
        params={'name':city,'count':100 if state else 15,'language':'en','format':'json'}
        data,hit=cached(('geo',city.lower(),bool(state)),lambda:provider(GEO,params),ttl=3600)
        options=data.get('results',[])
        exact=[x for x in options if x.get('name','').casefold()==city.casefold()]
        if exact: options=exact
        if state: options=[x for x in options if x.get('country_code')=='US' and x.get('admin1','').casefold()==state.casefold()]
        return {'results':options[:15],'cached':hit,'requested_state':state}

    @app.get('/api/forecast')
    def forecast(latitude:float=Query(ge=-90,le=90),longitude:float=Query(ge=-180,le=180)):
        lat=round(latitude,4);lon=round(longitude,4)
        forecast_args={'latitude':lat,'longitude':lon,'timezone':'auto','temperature_unit':'fahrenheit','wind_speed_unit':'mph','forecast_days':7,'current':'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m','hourly':'temperature_2m,precipitation_probability,weather_code,uv_index','daily':'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max'}
        air_args={'latitude':lat,'longitude':lon,'current':'us_aqi,pm2_5','timezone':'auto'}
        weather,hit=cached(('forecast',lat,lon),lambda:provider(FORECAST,forecast_args),ttl=600)
        try: air,_=cached(('air',lat,lon),lambda:provider(AIR,air_args),ttl=900)
        except HTTPException:air=None
        with lock:
            con.execute('INSERT INTO requests(queried_at,kind,latitude,longitude,cache_hit) VALUES(?,?,?,?,?)',(int(time.time()),'forecast',lat,lon,int(hit)))
            con.commit()
        return {'weather':weather,'air':air,'cached':hit,'source':'Open-Meteo'}

    @app.get('/api/observations')
    def observations():
        with lock:
            count=con.execute('SELECT COUNT(*) FROM requests').fetchone()[0]
            rows=con.execute('SELECT queried_at,kind,latitude,longitude,cache_hit FROM requests ORDER BY id DESC LIMIT 10').fetchall()
        return {'count':count,'recent':[{'timestamp':r[0],'kind':r[1],'latitude':r[2],'longitude':r[3],'cache_hit':bool(r[4])} for r in rows]}

    if serve_frontend:app.mount('/',StaticFiles(directory=str(DIR.parent),html=True),name='frontend')
    return app

app=create_app()
