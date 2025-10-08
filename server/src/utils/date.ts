export function parseDateISO(input?: string | null): Date | null {
  if (!input) return null;
  const d = new Date(input);
  return isNaN(+d) ? null : d;
}
