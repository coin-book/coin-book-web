/** Monthly instalments due after `from` up to `maturity` (ISO days), as the API's schedule counts them. */
export function instalmentsUntil(from: string, maturity: string, paymentDay: number): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [my, mm] = maturity.split('-').map(Number);
  const firstDue = Math.min(paymentDay, new Date(Date.UTC(fy, fm, 0)).getUTCDate());
  const firstMonthCounts = firstDue > fd ? 1 : 0;
  return Math.max(0, (my - fy) * 12 + (mm - fm) + firstMonthCounts);
}

/** The level instalment repaying `balanceMinor` in `months` at `annualRate` percent; a suggestion, the bank's figure wins. */
export function annuityMinor(balanceMinor: number, annualRate: number, months: number): number {
  if (balanceMinor <= 0 || months <= 0) return 0;
  if (annualRate === 0) return Math.ceil(balanceMinor / months);
  const i = annualRate / 100 / 12;
  const growth = (1 + i) ** months;
  return Math.round((balanceMinor * i * growth) / (growth - 1));
}
