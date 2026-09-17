import {
  computeDepartureDecision,
  findTargetArrivals,
  parseArrivalEpoch,
  type RealtimeArrivalItem,
} from "@/lib/subway-departure";

const STATION_NAME = "종합운동장";
const WALK_MINUTES = 10;
const MAX_TRAINS = 2;

type SeoulSubwayApiResponse = {
  errorMessage?: { status: number; code: string; message: string };
  realtimeArrivalList?: RealtimeArrivalItem[];
};

export async function GET() {
  const apiKey = process.env.SEOUL_SUBWAY_API_KEY;

  if (!apiKey) {
    return Response.json(
      { status: "unavailable", reason: "SEOUL_SUBWAY_API_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const url = `http://swopenapi.seoul.go.kr/api/subway/${apiKey}/json/realtimeStationArrival/0/20/${encodeURIComponent(
    STATION_NAME
  )}`;

  let data: SeoulSubwayApiResponse;
  try {
    const res = await fetch(url, { cache: "no-store" });
    data = (await res.json()) as SeoulSubwayApiResponse;
  } catch {
    return Response.json(
      { status: "unavailable", reason: "도착정보를 가져오지 못했습니다." },
      { status: 502 }
    );
  }

  if (data.errorMessage && data.errorMessage.code !== "INFO-000") {
    return Response.json(
      { status: "unavailable", reason: data.errorMessage.message },
      { status: 502 }
    );
  }

  const targets = findTargetArrivals(data.realtimeArrivalList ?? [], MAX_TRAINS);
  if (targets.length === 0) {
    return Response.json(
      { status: "unavailable", reason: "김포공항 방향 급행 열차 정보를 찾을 수 없습니다." },
      { status: 200 }
    );
  }

  const now = Date.now();
  const trains = targets.map((target) => {
    const arrivalEpochMs = parseArrivalEpoch(target.recptnDt, target.barvlDt);
    const decision = computeDepartureDecision(arrivalEpochMs, WALK_MINUTES, now);

    return {
      arrivalEpochMs,
      arrivalMessage: target.arvlMsg2,
      previousStation: target.arvlMsg3,
      ...decision,
    };
  });

  return Response.json({
    status: "ok",
    stationName: STATION_NAME,
    destination: targets[0].bstatnNm,
    walkMinutes: WALK_MINUTES,
    trains,
  });
}
