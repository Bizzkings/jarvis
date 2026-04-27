import type { Agent, AgentContext, AgentResponse, WeatherAgentData } from '../types'

const WMO_CODES: Record<number, string> = {
  0: 'clear skies',
  1: 'mainly clear',
  2: 'partly cloudy',
  3: 'overcast',
  45: 'foggy',
  48: 'icy fog',
  51: 'light drizzle',
  53: 'moderate drizzle',
  55: 'heavy drizzle',
  61: 'light rain',
  63: 'moderate rain',
  65: 'heavy rain',
  71: 'light snow',
  73: 'moderate snow',
  75: 'heavy snow',
  80: 'rain showers',
  81: 'moderate showers',
  82: 'violent showers',
  95: 'thunderstorm',
  96: 'thunderstorm with hail',
  99: 'severe thunderstorm',
}

function describeCode(code: number): string {
  return WMO_CODES[code] ?? 'mixed conditions'
}

function getLocation(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not available'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      () => reject(new Error('Location access denied'))
    )
  })
}

const weatherAgent: Agent = {
  name: 'Weather',

  canHandle(transcript: string): boolean {
    return /weather|temperature|how.*hot|how.*cold|forecast/.test(transcript)
  },

  async handle(_ctx: AgentContext): Promise<AgentResponse> {
    let coords: GeolocationCoordinates
    try {
      coords = await getLocation()
    } catch {
      return { text: "I couldn't access your location. Please allow location access and try again." }
    }

    const { latitude, longitude } = coords
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${latitude}&longitude=${longitude}` +
      `&current_weather=true&temperature_unit=fahrenheit`

    let json: { current_weather: { temperature: number; weathercode: number; windspeed: number } }
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Weather API error')
      json = await res.json()
    } catch {
      return { text: "I couldn't fetch the weather right now. Please try again." }
    }

    const { temperature, weathercode, windspeed } = json.current_weather
    const condition = describeCode(weathercode)

    const data: WeatherAgentData = {
      temp: Math.round(temperature),
      condition,
      windspeed: Math.round(windspeed),
      weathercode,
    }

    return {
      text: `It's ${Math.round(temperature)}°F with ${condition}. Wind speed is ${Math.round(windspeed)} miles per hour.`,
      data,
    }
  },
}

export default weatherAgent
