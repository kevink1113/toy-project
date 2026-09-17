export type RealtimeArrivalItem = {
  subwayId: string;
  bstatnNm: string;
  btrainSttus: string;
  barvlDt: string;
  arvlMsg2: string;
  arvlMsg3: string;
  recptnDt: string;
};

const TARGET_SUBWAY_ID = "1009";
const TARGET_DESTINATION = "김포공항";
const TARGET_TRAIN_STATUS = "급행";

export function findTargetArrivals(
  list: RealtimeArrivalItem[],
  limit = 2
): RealtimeArrivalItem[] {
  return list
    .filter(
      (item) =>
        item.subwayId === TARGET_SUBWAY_ID &&
        item.bstatnNm === TARGET_DESTINATION &&
        item.btrainSttus === TARGET_TRAIN_STATUS
    )
    .sort((a, b) => Number(a.barvlDt) - Number(b.barvlDt))
    .slice(0, limit);
}

export function findTargetArrival(
  list: RealtimeArrivalItem[]
): RealtimeArrivalItem | null {
  return findTargetArrivals(list, 1)[0] ?? null;
}

export function parseArrivalEpoch(
  recptnDt: string,
  barvlDtSeconds: number | string
): number {
  const isoLocal = recptnDt.replace(" ", "T") + "+09:00";
  const receivedAtMs = new Date(isoLocal).getTime();
  const remainingSeconds = Number(barvlDtSeconds);

  return receivedAtMs + remainingSeconds * 1000;
}

export type DepartureDecision = {
  departureEpochMs: number;
  shouldLeaveNow: boolean;
  minutesUntilDeparture: number;
};

export const PRECEDING_STATIONS = [
  "중앙보훈병원",
  "둔촌오륜",
  "올림픽공원",
  "한성백제",
  "송파나루",
  "석촌고분",
  "석촌",
  "삼전",
] as const;

export function findTrackPosition(
  previousStation: string,
  destinationStationName: string
): { stations: string[]; activeIndex: number } {
  const stations = [...PRECEDING_STATIONS, destinationStationName];
  const index = PRECEDING_STATIONS.indexOf(
    previousStation as (typeof PRECEDING_STATIONS)[number]
  );

  return { stations, activeIndex: index === -1 ? 0 : index };
}

export function remainingSecondsUntil(
  targetEpochMs: number,
  nowEpochMs: number
): number {
  return Math.max(0, Math.round((targetEpochMs - nowEpochMs) / 1000));
}

export function formatCountdown(remainingSeconds: number): string {
  const clamped = Math.max(0, remainingSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function selectPrimaryTrain<T extends { departureEpochMs: number }>(
  trains: T[],
  nowEpochMs: number
): T | undefined {
  const stillCatchable = trains.find(
    (train) => nowEpochMs <= train.departureEpochMs
  );

  return stillCatchable ?? trains[0];
}

export function computeDepartureDecision(
  arrivalEpochMs: number,
  walkMinutes: number,
  nowEpochMs: number
): DepartureDecision {
  const departureEpochMs = arrivalEpochMs - walkMinutes * 60_000;
  const shouldLeaveNow = nowEpochMs >= departureEpochMs;

  return {
    departureEpochMs,
    shouldLeaveNow,
    minutesUntilDeparture: shouldLeaveNow
      ? 0
      : Math.round((departureEpochMs - nowEpochMs) / 60_000),
  };
}
