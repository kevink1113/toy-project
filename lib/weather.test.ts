import { describe, expect, test } from "vitest";

import {
  computeTodayMinMax,
  isPrecipitating,
  selectTodayForecast,
  weatherIconKey,
  type ForecastEntry,
} from "@/lib/weather";

describe("isPrecipitating", () => {
  test("200(뇌우)이면 강수 중이다", () => {
    expect(isPrecipitating(200, false, false)).toBe(true);
  });

  test("500(비)이면 강수 중이다", () => {
    expect(isPrecipitating(500, false, false)).toBe(true);
  });

  test("800(맑음)이면 강수 중이 아니다", () => {
    expect(isPrecipitating(800, false, false)).toBe(false);
  });

  test("경계값: 299는 강수, 300은 강수(이슬비 시작), 399는 강수, 400은 강수 아님", () => {
    expect(isPrecipitating(299, false, false)).toBe(true);
    expect(isPrecipitating(300, false, false)).toBe(true);
    expect(isPrecipitating(399, false, false)).toBe(true);
    expect(isPrecipitating(400, false, false)).toBe(false);
  });

  test("경계값: 699는 강수(눈), 700은 강수 아님(안개 등 대기 현상)", () => {
    expect(isPrecipitating(699, false, false)).toBe(true);
    expect(isPrecipitating(700, false, false)).toBe(false);
  });

  test("weatherId가 맑음이어도 rain/snow 필드가 있으면 강수 중으로 본다", () => {
    expect(isPrecipitating(800, true, false)).toBe(true);
    expect(isPrecipitating(800, false, true)).toBe(true);
  });
});

describe("weatherIconKey", () => {
  test("200(뇌우)은 thunderstorm이다", () => {
    expect(weatherIconKey(200)).toBe("thunderstorm");
  });

  test("500(비)과 300(이슬비)은 rain이다", () => {
    expect(weatherIconKey(500)).toBe("rain");
    expect(weatherIconKey(300)).toBe("rain");
  });

  test("600(눈)은 snow다", () => {
    expect(weatherIconKey(600)).toBe("snow");
  });

  test("700(안개)은 fog다", () => {
    expect(weatherIconKey(700)).toBe("fog");
  });

  test("800(맑음)은 clear다", () => {
    expect(weatherIconKey(800)).toBe("clear");
  });

  test("801(구름)은 cloud다", () => {
    expect(weatherIconKey(801)).toBe("cloud");
  });

  test("경계값: 299/300, 399/400, 599/600, 699/700, 799/800, 800/801, 899/900", () => {
    expect(weatherIconKey(299)).toBe("thunderstorm");
    expect(weatherIconKey(300)).toBe("rain");
    expect(weatherIconKey(399)).toBe("rain");
    expect(weatherIconKey(400)).toBe("cloud"); // 400번대는 정의되지 않아 기본값
    expect(weatherIconKey(599)).toBe("rain");
    expect(weatherIconKey(600)).toBe("snow");
    expect(weatherIconKey(699)).toBe("snow");
    expect(weatherIconKey(700)).toBe("fog");
    expect(weatherIconKey(799)).toBe("fog");
    expect(weatherIconKey(800)).toBe("clear");
    expect(weatherIconKey(801)).toBe("cloud");
    expect(weatherIconKey(899)).toBe("cloud");
    expect(weatherIconKey(900)).toBe("cloud"); // 알 수 없는 값은 기본값
  });
});

const NOW = 1_000_000_000; // 임의의 기준 시각(ms)
const DAY_END = NOW + 6 * 3_600_000; // 6시간 뒤를 "자정"으로 가정

function entry(epochMs: number, temp: number, id: number, description: string): ForecastEntry {
  return {
    dt: Math.floor(epochMs / 1000),
    main: { temp },
    weather: [{ id, description }],
  };
}

describe("selectTodayForecast", () => {
  test("지금~자정 사이 항목만 시각 오름차순으로 변환한다", () => {
    const list = [
      entry(NOW + 3 * 3_600_000, 29.6, 800, "맑음"), // 나중 항목을 먼저 넣어 정렬 확인
      entry(NOW - 3_600_000, 20, 500, "비"), // 범위 밖(과거)
      entry(NOW, 24.4, 804, "온흐림"),
      entry(DAY_END, 18, 600, "눈"), // 범위 밖(자정 이후)
    ];

    const result = selectTodayForecast(list, NOW, DAY_END);

    expect(result).toEqual([
      { epochMs: NOW, tempC: 24, description: "온흐림", iconKey: "cloud" },
      { epochMs: NOW + 3 * 3_600_000, tempC: 30, description: "맑음", iconKey: "clear" },
    ]);
  });

  test("범위 안에 항목이 없으면 빈 배열을 반환한다", () => {
    const list = [entry(NOW - 3_600_000, 20, 500, "비")];

    expect(selectTodayForecast(list, NOW, DAY_END)).toEqual([]);
  });

  test("maxCount(기본 4)보다 많으면 앞에서부터 그만큼만 반환한다", () => {
    const list = [0, 1, 2, 3, 4].map((h) =>
      entry(NOW + h * 3_600_000, 20 + h, 800, "맑음")
    );

    const result = selectTodayForecast(list, NOW, NOW + 10 * 3_600_000);

    expect(result).toHaveLength(4);
    expect(result[0].epochMs).toBe(NOW);
    expect(result[3].epochMs).toBe(NOW + 3 * 3_600_000);
  });
});

describe("computeTodayMinMax", () => {
  test("지금~자정 사이 항목의 최저·최고 기온을 반올림해서 반환한다", () => {
    const list = [
      entry(NOW + 3 * 3_600_000, 29.6, 800, "맑음"),
      entry(NOW - 3_600_000, 100, 500, "비"), // 범위 밖: 최댓값이었다면 결과를 오염시켰을 값
      entry(NOW, 24.4, 804, "온흐림"),
    ];

    expect(computeTodayMinMax(list, NOW, DAY_END)).toEqual({ minC: 24, maxC: 30 });
  });

  test("범위 안에 항목이 없으면 null을 반환한다", () => {
    const list = [entry(NOW - 3_600_000, 20, 500, "비")];

    expect(computeTodayMinMax(list, NOW, DAY_END)).toBeNull();
  });
});
