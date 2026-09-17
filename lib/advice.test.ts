import { describe, expect, test } from "vitest";

import { parseAdviceResponse } from "@/lib/advice";

describe("parseAdviceResponse", () => {
  test("message와 author가 모두 있으면 그대로 반환한다", () => {
    const result = parseAdviceResponse({
      message: "매일을 인생의 마지막 날처럼 산다면...",
      author: "스티브 잡스",
    });

    expect(result).toEqual({
      message: "매일을 인생의 마지막 날처럼 산다면...",
      author: "스티브 잡스",
    });
  });

  test("author가 없으면 작자 미상으로 채운다", () => {
    const result = parseAdviceResponse({ message: "명언" });

    expect(result).toEqual({ message: "명언", author: "작자 미상" });
  });

  test("message가 없거나 빈 문자열이면 null을 반환한다", () => {
    expect(parseAdviceResponse({})).toBeNull();
    expect(parseAdviceResponse({ message: "" })).toBeNull();
    expect(parseAdviceResponse({ message: "   " })).toBeNull();
  });
});
