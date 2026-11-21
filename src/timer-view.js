import { icon } from './character.js';
import { startTimer, remainingSeconds, pauseTimer, resumeTimer, validTimer } from './timer.js';

export function createRestTimer({ onFinish }) {
  const root = document.getElementById('rest-timer');
  const key = 'sodatekin.rest-timer';
  let timer = null, finished = false;
  try { const saved = JSON.parse(sessionStorage.getItem(key)); if (validTimer(saved)) timer = saved; } catch { /* Timer remains usable without session storage. */ }
  function save() { try { timer ? sessionStorage.setItem(key, JSON.stringify(timer)) : sessionStorage.removeItem(key); } catch { /* Optional persistence. */ } }
  function markup() {
    root.hidden = !timer;
    document.body.classList.toggle('has-rest-timer', !!timer);
    if (!timer) { root.innerHTML = ''; return; }
    root.innerHTML = `<div class="timer-readout"><div class="timer-caption">${icon('timer')}<span id="timer-state"></span></div><strong id="timer-digits" role="timer" aria-label="残り時間"></strong></div><button type="button" data-timer="toggle" id="timer-toggle"></button><button type="button" data-timer="restart" aria-label="同じ時間でもう一度">${icon('turn')}</button><button type="button" data-timer="close" aria-label="タイマーを閉じる">${icon('close')}</button><span id="timer-announcement" class="sr-only" role="status" aria-live="polite"></span>`;
    tick();
  }
  function tick() {
    if (!timer) return;
    const seconds = remainingSeconds(timer);
    root.querySelector('#timer-digits').textContent = `${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')}`;
    root.querySelector('#timer-state').textContent = seconds === 0 ? '時間になりました' : timer.running ? 'ひと休みタイマー' : '一時停止中';
    const toggle = root.querySelector('#timer-toggle');
    toggle.textContent = seconds === 0 ? '完了' : timer.running ? '一時停止' : '再開';
    toggle.setAttribute('aria-label', seconds === 0 ? 'タイマーを完了する' : timer.running ? 'タイマーを一時停止' : 'タイマーを再開');
    root.classList.toggle('timer-finished', seconds === 0);
    if (seconds === 0 && !finished) {
      finished = true; timer = pauseTimer(timer); save();
      root.querySelector('#timer-announcement').textContent = 'タイマーの時間になりました。';
      onFinish?.();
    }
  }
  root.addEventListener('click', event => {
    const action = event.target.closest('[data-timer]')?.dataset.timer;
    if (!timer || !action) return;
    if (action === 'close' || (action === 'toggle' && remainingSeconds(timer) === 0)) timer = null;
    else if (action === 'restart') { timer = startTimer(timer.duration); finished = false; }
    else if (action === 'toggle') timer = timer.running ? pauseTimer(timer) : resumeTimer(timer);
    save(); markup();
    root.querySelector('#timer-toggle')?.focus({preventScroll:true});
  });
  setInterval(tick, 250);
  document.addEventListener('visibilitychange', tick);
  markup();
  return { start(seconds) { timer = startTimer(seconds); finished = false; save(); markup(); root.querySelector('#timer-toggle').focus({preventScroll:true}); } };
}
