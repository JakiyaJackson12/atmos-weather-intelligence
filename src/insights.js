// Explainable, testable decision rules. Suggestions are guidance, not safety alerts.
export function makeInsights(weather, air) {
  const rain = weather.daily.precipitation_probability_max[0] ?? 0;
  const uv = weather.daily.uv_index_max[0] ?? 0;
  const temp = weather.current.temperature_2m;
  const wind = weather.current.wind_speed_10m;
  const aqi = air?.current?.us_aqi;
  const chips = [];
  const paragraphs = [];

  if (rain >= 65) { chips.push('☂ Bring an umbrella'); paragraphs.push(`Rain is fairly likely today (${Math.round(rain)}% peak hourly probability). Plan indoor alternatives.`); }
  else if (rain >= 35) { chips.push('☁ Keep a rain backup'); paragraphs.push(`There's a chance of showers today (up to ${Math.round(rain)}% in an hour).`); }
  else { chips.push('✓ Low rain risk'); paragraphs.push('Rain chances look low today.'); }

  if (uv >= 6) { chips.push('☼ Sun protection'); paragraphs.push(`UV peaks near ${Math.round(uv)}, so consider shade and sun protection.`); }
  if (wind >= 20) { chips.push('≋ Windy conditions'); paragraphs.push(`Wind is around ${Math.round(wind)} mph; secure loose outdoor items.`); }
  if (temp >= 95) { chips.push('↗ Heat caution'); paragraphs.push('High temperatures can make prolonged outdoor activity uncomfortable.'); }
  else if (temp <= 35) { chips.push('↘ Dress warmly'); paragraphs.push('Cold conditions call for warm layers.'); }
  if (aqi != null && aqi > 100) { chips.push('≋ Air quality caution'); paragraphs.push(`Air quality is elevated (US AQI ${Math.round(aqi)}); sensitive groups should check local guidance.`); }

  const headline = rain >= 65 ? 'An indoor-plan kind of day.' : aqi != null && aqi > 100 ? 'Keep an eye on the air.' : uv >= 6 ? 'A little sun strategy goes a long way.' : 'A good day to make plans.';
  return { headline, description: paragraphs.join(' '), chips };
}

export function aqiLabel(value) {
  if (value == null) return 'Unavailable';
  if (value <= 50) return 'Good';
  if (value <= 100) return 'Moderate';
  if (value <= 150) return 'Unhealthy for sensitive groups';
  if (value <= 200) return 'Unhealthy';
  if (value <= 300) return 'Very unhealthy';
  return 'Hazardous';
}

export function weatherText(code) {
  if (code === 0) return 'Clear sky';
  if ([1, 2].includes(code)) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if ([45, 48].includes(code)) return 'Foggy';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rainy';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snowy';
  if ([95, 96, 99].includes(code)) return 'Thunderstorms';
  return 'Variable conditions';
}

export function weatherSymbol(code, isDay = true) {
  if (code === 0) return isDay ? '☀' : '☾';
  if ([1, 2].includes(code)) return isDay ? '⛅' : '☁';
  if (code === 3 || [45, 48].includes(code)) return '☁';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '☂';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄';
  if ([95, 96, 99].includes(code)) return 'ϟ';
  return '☁';
}
