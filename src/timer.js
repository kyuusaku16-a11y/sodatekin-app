export function remainingSeconds(timer, now = Date.now()) {
  return timer.running ? Math.max(0, Math.ceil((timer.deadline - now) / 1000)) : timer.remaining;
}
export function startTimer(seconds, now = Date.now()) {
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > 3600) throw new Error('タイマーは1〜3600秒で設定してください。');
  return { duration: seconds, remaining: seconds, deadline: now + seconds * 1000, running: true };
}
export function pauseTimer(timer, now = Date.now()) { return { ...timer, remaining: remainingSeconds(timer, now), deadline: null, running: false }; }
export function resumeTimer(timer, now = Date.now()) { return { ...timer, deadline: now + timer.remaining * 1000, running: timer.remaining > 0 }; }
export function validTimer(value) {
  return value && Number.isInteger(value.duration) && value.duration >= 1 && value.duration <= 3600 && Number.isInteger(value.remaining) && value.remaining >= 0 && value.remaining <= 3600 && typeof value.running === 'boolean' && (!value.running || (Number.isFinite(value.deadline) && value.deadline > 0));
}
