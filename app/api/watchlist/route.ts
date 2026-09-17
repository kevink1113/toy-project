import { buildWatchlist, fetchYahooSpark, WATCHLIST_SYMBOLS } from "@/lib/stocks";

export async function GET() {
  let raw;
  try {
    raw = await fetchYahooSpark(WATCHLIST_SYMBOLS);
  } catch {
    raw = null;
  }

  if (!raw) {
    return Response.json(
      { status: "unavailable", reason: "관심 종목 정보를 가져오지 못했습니다." },
      { status: 502 }
    );
  }

  return Response.json({
    status: "ok",
    items: buildWatchlist(WATCHLIST_SYMBOLS, raw),
  });
}
