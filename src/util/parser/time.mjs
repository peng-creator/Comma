export function parseTime(time) {
  const t = time.split(':');
  return t[0] * 3600 + t[1] * 60 + t[2] * 1;
}
