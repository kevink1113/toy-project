import { describe, expect, test } from "vitest";

import {
  computeDepartureDecision,
  findTargetArrival,
  findTargetArrivals,
  findTrackPosition,
  formatCountdown,
  parseArrivalEpoch,
  remainingSecondsUntil,
  selectPrimaryTrain,
} from "@/lib/subway-departure";
import type { RealtimeArrivalItem } from "@/lib/subway-departure";

// 2026-09-17 10:35 무렵 종합운동장역 실제 API 응답에서 발췌한 항목들.
const gimpoExpress: RealtimeArrivalItem = {
  subwayId: "1009",
  bstatnNm: "김포공항",
  btrainSttus: "급행",
  barvlDt: "510",
  arvlMsg2: "8분 30초 후 (올림픽공원)",
  arvlMsg3: "올림픽공원",
  recptnDt: "2026-09-17 10:35:21",
};
const line2Regular: RealtimeArrivalItem = {
  subwayId: "1002",
  bstatnNm: "성수",
  btrainSttus: "일반",
  barvlDt: "90",
  arvlMsg2: "전역 도착",
  arvlMsg3: "삼성",
  recptnDt: "2026-09-17 10:35:24",
};
const line9RegularToBohun: RealtimeArrivalItem = {
  subwayId: "1009",
  bstatnNm: "중앙보훈병원",
  btrainSttus: "일반",
  barvlDt: "735",
  arvlMsg2: "12분 15초 후 (사평)",
  arvlMsg3: "사평",
  recptnDt: "2026-09-17 10:35:21",
};
const line9ExpressToBohun: RealtimeArrivalItem = {
  subwayId: "1009",
  bstatnNm: "중앙보훈병원",
  btrainSttus: "급행",
  barvlDt: "335",
  arvlMsg2: "5분 35초 후 (선정릉)",
  arvlMsg3: "선정릉",
  recptnDt: "2026-09-17 10:35:21",
};

describe("parseArrivalEpoch", () => {
  test("수신시각(KST)에 남은 초를 더해 도착 예정 시각을 epoch ms로 반환한다", () => {
    // 2026-09-17 10:35:21 KST + 140초 = 2026-09-17 10:37:41 KST
    // = 2026-09-17T01:37:41.000Z (독립적으로 계산한 값)
    const result = parseArrivalEpoch("2026-09-17 10:35:21", 140);

    expect(result).toBe(1789609061000);
  });
});

describe("findTargetArrival", () => {
  test("9호선·김포공항 종착·급행 조건을 모두 만족하는 항목을 찾는다", () => {
    const list = [line2Regular, line9RegularToBohun, gimpoExpress, line9ExpressToBohun];

    const result = findTargetArrival(list);

    expect(result).toBe(gimpoExpress);
  });

  test("조건에 맞는 열차가 둘 이상이면 barvlDt가 더 작은(먼저 도착하는) 쪽을 고른다", () => {
    const soonerGimpoExpress: RealtimeArrivalItem = {
      ...gimpoExpress,
      barvlDt: "120",
    };
    const list = [gimpoExpress, soonerGimpoExpress, line9RegularToBohun];

    const result = findTargetArrival(list);

    expect(result).toBe(soonerGimpoExpress);
  });

  test("조건에 맞는 열차가 없으면 null을 반환한다", () => {
    const list = [line2Regular, line9RegularToBohun, line9ExpressToBohun];

    const result = findTargetArrival(list);

    expect(result).toBeNull();
  });
});

describe("findTargetArrivals", () => {
  test("조건에 맞는 열차를 barvlDt 오름차순으로 최대 limit개까지 반환한다", () => {
    const laterGimpoExpress: RealtimeArrivalItem = {
      ...gimpoExpress,
      barvlDt: "900",
    };
    const evenLaterGimpoExpress: RealtimeArrivalItem = {
      ...gimpoExpress,
      barvlDt: "1200",
    };
    const list = [
      evenLaterGimpoExpress,
      line2Regular,
      gimpoExpress,
      laterGimpoExpress,
      line9RegularToBohun,
    ];

    const result = findTargetArrivals(list, 2);

    expect(result).toEqual([gimpoExpress, laterGimpoExpress]);
  });

  test("조건에 맞는 열차가 없으면 빈 배열을 반환한다", () => {
    const list = [line2Regular, line9RegularToBohun, line9ExpressToBohun];

    const result = findTargetArrivals(list, 2);

    expect(result).toEqual([]);
  });
});

describe("computeDepartureDecision", () => {
  const arrivalEpochMs = 1_000_000_000_000; // 임의의 도착 예정 시각
  const walkMinutes = 10;
  const departureEpochMs = arrivalEpochMs - walkMinutes * 60_000; // 999_999_400_000

  test("출발 시각 전이면 남은 분을 반올림해서 보여주고 아직 출발할 때가 아니라고 판단한다", () => {
    const nowEpochMs = departureEpochMs - 5 * 60_000; // 출발 5분 전

    const result = computeDepartureDecision(arrivalEpochMs, walkMinutes, nowEpochMs);

    expect(result).toEqual({
      departureEpochMs,
      shouldLeaveNow: false,
      minutesUntilDeparture: 5,
    });
  });

  test("출발 시각을 지났으면 지금 출발해야 한다고 판단한다", () => {
    const nowEpochMs = departureEpochMs + 2 * 60_000; // 출발 2분 지남

    const result = computeDepartureDecision(arrivalEpochMs, walkMinutes, nowEpochMs);

    expect(result).toEqual({
      departureEpochMs,
      shouldLeaveNow: true,
      minutesUntilDeparture: 0,
    });
  });

  test("정확히 출발 시각이면 지금 출발해야 한다고 판단한다", () => {
    const result = computeDepartureDecision(arrivalEpochMs, walkMinutes, departureEpochMs);

    expect(result.shouldLeaveNow).toBe(true);
  });
});

describe("findTrackPosition", () => {
  const fullLine = [
    "중앙보훈병원",
    "둔촌오륜",
    "올림픽공원",
    "한성백제",
    "송파나루",
    "석촌고분",
    "석촌",
    "삼전",
    "종합운동장",
  ];

  test("지나온 역이 이전 역 목록에 있으면 그 인덱스를 반환한다", () => {
    const result = findTrackPosition("석촌", "종합운동장");

    expect(result).toEqual({ stations: fullLine, activeIndex: 6 });
  });

  test("종합운동장에서 가장 먼 역(종점)도 목록 맨 앞에서 찾는다", () => {
    const result = findTrackPosition("중앙보훈병원", "종합운동장");

    expect(result).toEqual({ stations: fullLine, activeIndex: 0 });
  });

  test("지나온 역이 목록에 없으면(알 수 없는 역명) 0으로 clamp한다", () => {
    const result = findTrackPosition("알수없는역", "종합운동장");

    expect(result).toEqual({ stations: fullLine, activeIndex: 0 });
  });
});

describe("remainingSecondsUntil", () => {
  test("목표 시각까지 남은 초를 반올림해서 반환한다", () => {
    const targetEpochMs = 1_000_000_000_000;
    const nowEpochMs = targetEpochMs - 105_400; // 105.4초 전 → 반올림 105초

    const result = remainingSecondsUntil(targetEpochMs, nowEpochMs);

    expect(result).toBe(105);
  });

  test("이미 지난 시각이면 0으로 clamp한다", () => {
    const targetEpochMs = 1_000_000_000_000;
    const nowEpochMs = targetEpochMs + 30_000; // 30초 지남

    const result = remainingSecondsUntil(targetEpochMs, nowEpochMs);

    expect(result).toBe(0);
  });
});

describe("formatCountdown", () => {
  test("105초를 1:45로 포맷한다", () => {
    expect(formatCountdown(105)).toBe("1:45");
  });

  test("45초를 0:45로 포맷한다(초는 0 패딩)", () => {
    expect(formatCountdown(45)).toBe("0:45");
  });

  test("0 이하는 0:00으로 포맷한다", () => {
    expect(formatCountdown(0)).toBe("0:00");
    expect(formatCountdown(-5)).toBe("0:00");
  });
});

describe("selectPrimaryTrain", () => {
  const NOW = 1_000_000_000_000;
  const train = (id: string, departureEpochMs: number) => ({ id, departureEpochMs });

  test("첫 번째 열차의 마지노선이 아직 지나지 않았으면 그대로 선택한다", () => {
    const trains = [train("A", NOW + 60_000), train("B", NOW + 600_000)];

    expect(selectPrimaryTrain(trains, NOW)).toBe(trains[0]);
  });

  test("첫 번째는 이미 지났고 두 번째는 아직이면 두 번째를 선택한다", () => {
    const trains = [train("A", NOW - 60_000), train("B", NOW + 600_000)];

    expect(selectPrimaryTrain(trains, NOW)).toBe(trains[1]);
  });

  test("정확히 마지노선 시각이면 아직 지나지 않은 것으로 보고 그 열차를 선택한다", () => {
    const trains = [train("A", NOW)];

    expect(selectPrimaryTrain(trains, NOW)).toBe(trains[0]);
  });

  test("전부 마지노선을 지났으면 첫 번째로 폴백한다", () => {
    const trains = [train("A", NOW - 60_000), train("B", NOW - 30_000)];

    expect(selectPrimaryTrain(trains, NOW)).toBe(trains[0]);
  });

  test("빈 배열이면 undefined를 반환한다", () => {
    expect(selectPrimaryTrain([], NOW)).toBeUndefined();
  });
});

