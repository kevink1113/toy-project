const PRECIPITATION_RANGES: Array<[number, number]> = [
  [200, 299],
  [300, 399],
  [500, 599],
  [600, 699],
];

export function isPrecipitating(
  weatherId: number,
  hasRainField: boolean,
  hasSnowField: boolean
): boolean {
  if (hasRainField || hasSnowField) {
    return true;
  }

  return PRECIPITATION_RANGES.some(
    ([min, max]) => weatherId >= min && weatherId <= max
  );
}

export type WeatherIconKey =
  | "clear"
  | "cloud"
  | "rain"
  | "snow"
  | "thunderstorm"
  | "fog";

export type ForecastEntry = {
  dt: number;
  main: { temp: number };
  weather: Array<{ id: number; description: string }>;
};

export type HourlyForecast = {
  epochMs: number;
  tempC: number;
  description: string;
  iconKey: WeatherIconKey;
};

function selectTodayEntries(
  list: ForecastEntry[],
  nowEpochMs: number,
  dayEndEpochMs: number
): ForecastEntry[] {
  return list
    .filter((entry) => {
      const epochMs = entry.dt * 1000;
      return epochMs >= nowEpochMs && epochMs < dayEndEpochMs;
    })
    .sort((a, b) => a.dt - b.dt);
}

export function selectTodayForecast(
  list: ForecastEntry[],
  nowEpochMs: number,
  dayEndEpochMs: number,
  maxCount = 4
): HourlyForecast[] {
  return selectTodayEntries(list, nowEpochMs, dayEndEpochMs)
    .slice(0, maxCount)
    .map((entry) => ({
      epochMs: entry.dt * 1000,
      tempC: Math.round(entry.main.temp),
      description: entry.weather[0].description,
      iconKey: weatherIconKey(entry.weather[0].id),
    }));
}

export function computeTodayMinMax(
  list: ForecastEntry[],
  nowEpochMs: number,
  dayEndEpochMs: number
): { minC: number; maxC: number } | null {
  const entries = selectTodayEntries(list, nowEpochMs, dayEndEpochMs);

  if (entries.length === 0) {
    return null;
  }

  const temps = entries.map((entry) => entry.main.temp);

  return {
    minC: Math.round(Math.min(...temps)),
    maxC: Math.round(Math.max(...temps)),
  };
}

export function weatherIconKey(weatherId: number): WeatherIconKey {
  if (weatherId >= 200 && weatherId <= 299) return "thunderstorm";
  if (weatherId >= 300 && weatherId <= 399) return "rain";
  if (weatherId >= 500 && weatherId <= 599) return "rain";
  if (weatherId >= 600 && weatherId <= 699) return "snow";
  if (weatherId >= 700 && weatherId <= 799) return "fog";
  if (weatherId === 800) return "clear";
  if (weatherId >= 801 && weatherId <= 899) return "cloud";

  return "cloud";
}
