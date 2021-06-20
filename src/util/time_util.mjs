/* eslint-disable prefer-template */
export function timeToMilliseconds(time) {
  // eslint-disable-next-line prefer-const
  let [h, m, sm] = time.split(':');
  let [s, mm] = sm.split('.');
  h = parseInt(h, 10);
  m = parseInt(m, 10);
  s = parseInt(s, 10);
  mm = parseInt(mm, 10);
  if (h < 0) {
    h = 0;
  }
  if (m < 0) {
    m = 0;
  }
  if (s < 0) {
    s = 0;
  }
  if (mm < 0) {
    mm = 0;
  }
  return (h * 60 * 60 + m * 60 + s) * 1000 + mm;
}

export function secondsToTime(seconds) {
  const localSeconds = parseInt(`${seconds}`, 10);
  const h = parseInt(localSeconds / (60 * 60), 10);
  const m = parseInt(localSeconds / 60, 10) - h * 60;
  const s = seconds % 60;
  return `${(h + '').padStart(2, '0')}:${(m + '').padStart(2, '0')}:${(
    s + ''
  ).padStart(2, '0')}`;
}

export function millisecondsToTime(millseconds) {
  const localMillseconds = parseInt(`${millseconds}`, 10);
  const mm = localMillseconds % 1000;
  const seconds = (localMillseconds - mm) / 1000;
  return `${secondsToTime(seconds)}.${mm}`;
}

export function timeDifference(a, b) {
  return Math.abs(timeToMilliseconds(b) - timeToMilliseconds(a));
}
