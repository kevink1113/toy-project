import { describe, expect, test } from "vitest";

import { backgroundQueryForHour, parseUnsplashPhoto } from "@/lib/background";

describe("backgroundQueryForHour", () => {
  test("아침·오후·저녁·밤 시간대에 맞는 검색어를 반환한다", () => {
    expect(backgroundQueryForHour(9)).toBe("sunrise city");
    expect(backgroundQueryForHour(14)).toBe("city skyline day");
    expect(backgroundQueryForHour(19)).toBe("sunset city");
    expect(backgroundQueryForHour(1)).toBe("night city lights");
  });
});

describe("parseUnsplashPhoto", () => {
  test("필요한 필드가 모두 있으면 그대로 뽑아낸다", () => {
    const result = parseUnsplashPhoto({
      urls: { regular: "https://images.unsplash.com/photo-1" },
      user: { name: "Jane Doe", links: { html: "https://unsplash.com/@jane" } },
      links: { download_location: "https://api.unsplash.com/photos/1/download" },
    });

    expect(result).toEqual({
      imageUrl: "https://images.unsplash.com/photo-1",
      photographerName: "Jane Doe",
      photographerProfileUrl: "https://unsplash.com/@jane",
      downloadLocationUrl: "https://api.unsplash.com/photos/1/download",
    });
  });

  test("필요한 필드 중 하나라도 없으면 null을 반환한다", () => {
    expect(parseUnsplashPhoto({})).toBeNull();
    expect(
      parseUnsplashPhoto({ urls: { regular: "https://images.unsplash.com/photo-1" } })
    ).toBeNull();
  });
});
