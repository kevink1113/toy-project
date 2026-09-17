export function backgroundQueryForHour(hour: number): string {
  if (hour >= 5 && hour < 12) {
    return "sunrise city";
  }

  if (hour >= 12 && hour < 18) {
    return "city skyline day";
  }

  if (hour >= 18 && hour < 22) {
    return "sunset city";
  }

  return "night city lights";
}

type RawUnsplashPhoto = {
  urls?: { regular?: unknown };
  user?: { name?: unknown; links?: { html?: unknown } };
  links?: { download_location?: unknown };
};

export type BackgroundPhoto = {
  imageUrl: string;
  photographerName: string;
  photographerProfileUrl: string;
  downloadLocationUrl: string;
};

export function parseUnsplashPhoto(raw: RawUnsplashPhoto): BackgroundPhoto | null {
  const imageUrl = raw.urls?.regular;
  const photographerName = raw.user?.name;
  const photographerProfileUrl = raw.user?.links?.html;
  const downloadLocationUrl = raw.links?.download_location;

  if (
    typeof imageUrl !== "string" ||
    typeof photographerName !== "string" ||
    typeof photographerProfileUrl !== "string" ||
    typeof downloadLocationUrl !== "string"
  ) {
    return null;
  }

  return { imageUrl, photographerName, photographerProfileUrl, downloadLocationUrl };
}
