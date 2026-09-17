import { describe, expect, test } from "vitest";

import { greetingForHour } from "@/lib/greeting";

describe("greetingForHour", () => {
  test("5시~11시는 아침 인사를 반환한다", () => {
    expect(greetingForHour(5)).toBe("좋은 아침입니다");
    expect(greetingForHour(11)).toBe("좋은 아침입니다");
  });

  test("12시~17시는 오후 인사를 반환한다", () => {
    expect(greetingForHour(12)).toBe("좋은 오후입니다");
    expect(greetingForHour(17)).toBe("좋은 오후입니다");
  });

  test("18시~21시는 저녁 인사를 반환한다", () => {
    expect(greetingForHour(18)).toBe("좋은 저녁입니다");
    expect(greetingForHour(21)).toBe("좋은 저녁입니다");
  });

  test("22시~4시(자정 넘김 포함)는 밤 인사를 반환한다", () => {
    expect(greetingForHour(22)).toBe("좋은 밤입니다");
    expect(greetingForHour(0)).toBe("좋은 밤입니다");
    expect(greetingForHour(4)).toBe("좋은 밤입니다");
  });
});
