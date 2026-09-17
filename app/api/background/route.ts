import { backgroundQueryForHour, parseUnsplashPhoto, type BackgroundPhoto } from "@/lib/background";

// Demo 앱은 시간당 50회 제한이라, 같은 날 같은 시간대(아침/오후/저녁/밤)에는
// 서버 메모리에 캐시해둔 사진을 재사용하고 새로 받아오지 않는다.
let cache: { key: string; photo: BackgroundPhoto } | null = null;

export async function GET() {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    return Response.json(
      { status: "unavailable", reason: "UNSPLASH_ACCESS_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const now = new Date();
  const query = backgroundQueryForHour(now.getHours());
  const cacheKey = `${now.toISOString().slice(0, 10)}:${query}`;

  if (cache && cache.key === cacheKey) {
    return Response.json({ status: "ok", ...toResponseShape(cache.photo) });
  }

  let photo: BackgroundPhoto | null = null;
  try {
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${accessKey}` }, cache: "no-store" }
    );
    if (res.ok) {
      photo = parseUnsplashPhoto(await res.json());
    }
  } catch {
    photo = null;
  }

  if (!photo) {
    return Response.json(
      { status: "unavailable", reason: "배경 이미지를 가져오지 못했습니다." },
      { status: 502 }
    );
  }

  // API 이용 가이드라인: 실제로 화면에 쓰기로 선택한 사진은 download 엔드포인트를
  // 한 번 호출해 집계한다. 실패해도 배경 표시 자체는 막지 않는다.
  try {
    await fetch(photo.downloadLocationUrl, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });
  } catch {
    // 집계 실패는 무시한다.
  }

  cache = { key: cacheKey, photo };

  return Response.json({ status: "ok", ...toResponseShape(photo) });
}

function toResponseShape(photo: BackgroundPhoto) {
  return {
    imageUrl: photo.imageUrl,
    photographerName: photo.photographerName,
    photographerProfileUrl: photo.photographerProfileUrl,
  };
}
