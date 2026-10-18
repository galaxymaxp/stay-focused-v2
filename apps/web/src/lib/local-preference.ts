export function readLocalPreference(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
export function writeLocalPreference(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* Keep this visit's preference. */ }
}
