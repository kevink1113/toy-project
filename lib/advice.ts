export type AdviceItem = { message: string; author: string };

type RawAdviceResponse = { message?: unknown; author?: unknown };

export function parseAdviceResponse(body: RawAdviceResponse): AdviceItem | null {
  if (typeof body.message !== "string" || body.message.trim() === "") {
    return null;
  }

  return {
    message: body.message,
    author: typeof body.author === "string" && body.author.trim() !== ""
      ? body.author
      : "작자 미상",
  };
}
