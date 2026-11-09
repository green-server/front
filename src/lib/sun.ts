// Where the sun is overhead right now, in degrees. Declination from the day of the year,
// longitude from UTC time; ponytail: ignores the equation of time (up to ~4° off).
export function subsolar(date: Date): { lat: number; lon: number } {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = (date.getTime() - start) / 86_400_000;
  const lat = -23.44 * Math.cos((2 * Math.PI * (day + 10)) / 365);
  const hours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const lon = ((((12 - hours) * 15 + 180) % 360) + 360) % 360 - 180;
  return { lat, lon };
}
