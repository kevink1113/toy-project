import { HOME_LATITUDE, HOME_LONGITUDE } from "@/lib/location";
import {
  computeTodayMinMax,
  isPrecipitating,
  selectTodayForecast,
  weatherIconKey,
  type ForecastEntry,
} from "@/lib/weather";

type CurrentWeatherResponse = {
  weather: Array<{ id: number; description: string }>;
  main: { temp: number };
  rain?: unknown;
  snow?: unknown;
};

type ForecastResponse = {
  list: ForecastEntry[];
};

const hourFormatter = new Intl.DateTimeFormat("ko-KR", { hour: "numeric" });

async function fetchJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    return null;
  }
  return (await res.json()) as T;
}

export async function GET() {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;

  if (!apiKey) {
    return Response.json(
      { status: "unavailable", reason: "OPENWEATHERMAP_API_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${HOME_LATITUDE}&lon=${HOME_LONGITUDE}&appid=${apiKey}&units=metric&lang=kr`;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${HOME_LATITUDE}&lon=${HOME_LONGITUDE}&appid=${apiKey}&units=metric&lang=kr`;

  let current: CurrentWeatherResponse | null;
  let forecast: ForecastResponse | null;
  try {
    [current, forecast] = await Promise.all([
      fetchJson<CurrentWeatherResponse>(currentUrl),
      fetchJson<ForecastResponse>(forecastUrl),
    ]);
  } catch {
    current = null;
    forecast = null;
  }

  if (!current || !forecast) {
    return Response.json(
      { status: "unavailable", reason: "날씨 정보를 가져오지 못했습니다." },
      { status: 502 }
    );
  }

  const [weather] = current.weather;
  if (!weather) {
    return Response.json(
      { status: "unavailable", reason: "날씨 정보를 가져올 수 없습니다." },
      { status: 200 }
    );
  }

  const now = Date.now();
  const today = new Date(now);
  const dayEnd = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1
  ).getTime();

  return Response.json({
    status: "ok",
    tempC: Math.round(current.main.temp),
    description: weather.description,
    iconKey: weatherIconKey(weather.id),
    isPrecipitating: isPrecipitating(
      weather.id,
      current.rain !== undefined,
      current.snow !== undefined
    ),
    hourly: selectTodayForecast(forecast.list, now, dayEnd).map((item) => ({
      timeLabel: hourFormatter.format(item.epochMs),
      tempC: item.tempC,
      iconKey: item.iconKey,
    })),
    minMax: computeTodayMinMax(forecast.list, now, dayEnd),
  });
}
