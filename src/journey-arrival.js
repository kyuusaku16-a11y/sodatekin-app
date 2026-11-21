// A single, finite arrival notice. It never changes records, focus or scroll.
export function createJourneyArrivalPlayer({ onFinish = () => {} } = {}) {
  let root = null, copy = null, timer = null;
  function cancel() {
    clearTimeout(timer); timer = null;
    root?.remove(); root = null;
    copy?.classList.remove('place-arrival-copy'); copy = null;
    document.documentElement.classList.remove('journey-arrival-running');
  }
  function play(scene, { reducedMotion = false } = {}) {
    cancel();
    if (!scene || document.hidden || document.querySelector('#modal')?.open) return;
    const candidate = document.querySelector('.hero-panel .partner-copy');
    const rect = candidate?.getBoundingClientRect();
    const nav = innerWidth <= 760 ? document.querySelector('.sidebar')?.getBoundingClientRect().top : innerHeight;
    const bottom = nav ?? innerHeight;
    const inHero = rect && rect.top >= 0 && rect.bottom <= bottom && rect.height >= 64;
    root = document.createElement('div');
    root.className = `journey-arrival${reducedMotion ? ' is-static' : ''}`;
    root.id = 'journey-arrival';
    root.setAttribute('role', 'status');
    root.setAttribute('aria-live', 'polite');
    const label = document.createElement('span'); label.textContent = scene.number === 1 ? 'ふたりの旅がはじまった' : '新しい場所に着いた';
    const title = document.createElement('strong'); title.textContent = scene.title;
    root.append(label, title);
    const width = inHero ? rect.width : Math.min(320, innerWidth - 32);
    Object.assign(root.style, { width: `${width}px`, left: `${inHero ? rect.left : (innerWidth - width) / 2}px`, top: `${inHero ? rect.top : 64}px`, minHeight: `${inHero ? rect.height : 72}px` });
    if (inHero) { copy = candidate; copy.classList.add('place-arrival-copy'); }
    document.documentElement.classList.add('journey-arrival-running');
    document.body.append(root);
    timer = setTimeout(() => { cancel(); onFinish(); }, 2400);
  }
  return { play, cancel, isPlaying: () => !!root };
}
