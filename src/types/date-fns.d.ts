declare module 'date-fns' {
  export function format(date: Date | number | string, formatStr: string): string;
  export function parseISO(argument: string): Date;
  export function subDays(date: Date | number, amount: number): Date;
  export function addDays(date: Date | number, amount: number): Date;
  export function startOfMonth(date: Date | number): Date;
  export function endOfMonth(date: Date | number): Date;
  export function getDaysInMonth(date: Date | number): number;
}
