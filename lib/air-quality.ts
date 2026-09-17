export type AirQualityIndex = 1 | 2 | 3 | 4 | 5;

export function airQualityLabel(aqi: AirQualityIndex): string {
  switch (aqi) {
    case 1:
      return "좋음";
    case 2:
      return "보통";
    case 3:
      return "민감군 영향";
    case 4:
      return "나쁨";
    case 5:
      return "매우 나쁨";
  }
}
