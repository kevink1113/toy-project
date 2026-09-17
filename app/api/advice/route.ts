import { parseAdviceResponse } from "@/lib/advice";

const ADVICE_API_URL = "https://korean-advice-open-api.vercel.app/api/advice";

export async function GET() {
  let body: unknown;
  try {
    const res = await fetch(ADVICE_API_URL, { cache: "no-store" });
    if (!res.ok) {
      return Response.json(
        { status: "unavailable", reason: "오늘의 명언을 가져오지 못했습니다." },
        { status: 502 }
      );
    }
    body = await res.json();
  } catch {
    return Response.json(
      { status: "unavailable", reason: "오늘의 명언을 가져오지 못했습니다." },
      { status: 502 }
    );
  }

  const advice = parseAdviceResponse(body as Record<string, unknown>);
  if (!advice) {
    return Response.json(
      { status: "unavailable", reason: "오늘의 명언을 가져오지 못했습니다." },
      { status: 200 }
    );
  }

  return Response.json({ status: "ok", ...advice });
}
