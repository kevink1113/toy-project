import { describe, expect, test } from "vitest";

import { buildMonthGrid } from "@/lib/month-calendar";

describe("buildMonthGrid", () => {
  test("2026년 9월 17일 기준으로 9월 전체를 일요일 시작 주 단위로 나눈다", () => {
    // 2026-09-01은 화요일, 9월은 30일까지 있다.
    const result = buildMonthGrid(new Date(2026, 8, 17));

    expect(result.year).toBe(2026);
    expect(result.month).toBe(9);
    expect(result.todayDate).toBe(17);
    expect(result.weeks[0]).toEqual([null, null, 1, 2, 3, 4, 5]);
    expect(result.weeks[result.weeks.length - 1]).toEqual([
      27, 28, 29, 30, null, null, null,
    ]);
    expect(result.weeks.flat().filter((day) => day !== null)).toHaveLength(30);
  });

  test("모든 주는 7칸으로 채워진다", () => {
    const result = buildMonthGrid(new Date(2026, 8, 17));

    for (const week of result.weeks) {
      expect(week).toHaveLength(7);
    }
  });
});
