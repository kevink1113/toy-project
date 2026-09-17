import { describe, expect, test } from "vitest";

import { airQualityLabel } from "@/lib/air-quality";

describe("airQualityLabel", () => {
  test("OpenWeatherMap의 1~5 지수를 한국어 등급으로 변환한다", () => {
    expect(airQualityLabel(1)).toBe("좋음");
    expect(airQualityLabel(2)).toBe("보통");
    expect(airQualityLabel(3)).toBe("민감군 영향");
    expect(airQualityLabel(4)).toBe("나쁨");
    expect(airQualityLabel(5)).toBe("매우 나쁨");
  });
});
