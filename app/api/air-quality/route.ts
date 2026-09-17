import { airQualityLabel, type AirQualityIndex } from "@/lib/air-quality";
import { HOME_LATITUDE, HOME_LONGITUDE } from "@/lib/location";

type AirPollutionResponse = {
  list: Array<{
    main: { aqi: AirQualityIndex };
    components: { pm2_5: number; pm10: number };
  }>;
};

export async function GET() {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;

  if (!apiKey) {
    return Response.json(
      { status: "unavailable", reason: "OPENWEATHERMAP_API_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${HOME_LATITUDE}&lon=${HOME_LONGITUDE}&appid=${apiKey}`;

  let body: AirPollutionResponse | null = null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      body = (await res.json()) as AirPollutionResponse;
    }
  } catch {
    body = null;
  }

  const entry = body?.list?.[0];
  if (!entry) {
    return Response.json(
      { status: "unavailable", reason: "대기질 정보를 가져오지 못했습니다." },
      { status: 502 }
    );
  }

  return Response.json({
    status: "ok",
    aqi: entry.main.aqi,
    label: airQualityLabel(entry.main.aqi),
    pm25: Math.round(entry.components.pm2_5),
    pm10: Math.round(entry.components.pm10),
  });
}
