export function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) {
    return "좋은 아침입니다";
  }

  if (hour >= 12 && hour < 18) {
    return "좋은 오후입니다";
  }

  if (hour >= 18 && hour < 22) {
    return "좋은 저녁입니다";
  }

  return "좋은 밤입니다";
}
