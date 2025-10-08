export function parseDatePickerToISO(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const [d, m, y] = dateStr.split('.').map((x) => parseInt(x, 10));
  if (!y || !m || !d) return null;
  const iso = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toISOString();
  return iso;
}

export function formatISOToDatePicker(iso?: string | null): string | null {
  if (!iso) return null;
  const dt = new Date(iso);
  const d = String(dt.getUTCDate()).padStart(2, '0');
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const y = dt.getUTCFullYear();
  return `${d}.${m}.${y}`;
}
