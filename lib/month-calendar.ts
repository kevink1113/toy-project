export type MonthGrid = {
  year: number;
  month: number; // 1~12
  todayDate: number;
  weeks: (number | null)[][];
};

export function buildMonthGrid(date: Date): MonthGrid {
  const year = date.getFullYear();
  const month = date.getMonth();
  const todayDate = date.getDate();

  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return { year, month: month + 1, todayDate, weeks };
}
