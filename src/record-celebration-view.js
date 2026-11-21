import { studioLight } from './studio-character.js';
import { PARTS } from './rules.js';
import { characterMarkup, paintCharacters } from './character-renderer.js';

const partName = id => PARTS.find(part => part.id === id)?.name || '';
const xpText = value => Number(value.toFixed(2)).toLocaleString('ja-JP');
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function viewport() {
  const nav = document.querySelector('.sidebar')?.getBoundingClientRect();
  return { width: innerWidth, bottom: innerWidth <= 760 && nav ? Math.min(innerHeight, nav.top) : innerHeight };
}
function visibleRect(element, area) {
  if (!element?.getClientRects().length) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0 || rect.top < 0 || rect.bottom > area.bottom || rect.left < 0 || rect.right > area.width) return null;
  return rect;
}

// Capture before a successful save closes the form and replaces the app DOM.
export function captureCelebrationOrigin(element = document.activeElement) {
  const area = viewport();
  const button = element?.closest('button') || element?.closest('form')?.querySelector('[type="submit"]');
  const rect = button?.getBoundingClientRect();
  return {
    x: clamp(rect ? rect.left + rect.width / 2 : area.width / 2, 48, area.width - 48),
    y: clamp(rect ? rect.top + rect.height / 2 : area.bottom - 120, 70, area.bottom - 40),
  };
}

// This player owns a single finite effect outside #app. Re-rendering the app
// cannot replay it. Every new save replaces the previous generation.
export function createCelebrationPlayer({ onFinish = () => {} } = {}) {
  let generation = 0, timer = null, root = null, touched = [], inlinePanel = null;
  const classes = ['record-celebration-running', 'record-celebration-moving', 'record-celebration-static', 'record-celebration-workout', 'record-celebration-level', 'record-celebration-shape'];
  function cancel() {
    generation++;
    clearTimeout(timer); timer = null;
    root?.remove(); root = null;
    if (inlinePanel) {
      inlinePanel.querySelector('.growth-result')?.remove();
      inlinePanel.querySelector('.growth-proud-portrait')?.remove();
      inlinePanel.classList.remove('growth-confirming');
      inlinePanel = null;
    }
    document.documentElement.classList.remove(...classes);
    for (const node of touched) node.classList.remove('celebration-target', 'celebration-copy');
    touched = [];
  }
  function play(effect, { origin, parts, bodyType, outfit = null, back = false, reducedMotion = false, inlineGrowth = null } = {}) {
    cancel();
    const ticket = generation;
    const finish = () => {
      if (ticket !== generation) return;
      cancel(); onFinish();
    };
    document.documentElement.classList.add('record-celebration-running', `record-celebration-${effect.kind}`, reducedMotion ? 'record-celebration-static' : 'record-celebration-moving');
    // Let the batch-save and dialog-close handlers finish their synchronous
    // renders before taking target positions. No continuous animation loop.
    queueMicrotask(() => {
      if (ticket !== generation) return;
      if (document.visibilityState !== 'visible') { finish(); return; }
      try {
        root = document.createElement('div');
        root.id = 'record-celebration';
        root.className = `record-celebration effect-${effect.kind}${reducedMotion ? ' is-static' : ''}`;
        root.setAttribute('aria-hidden', 'true');
        root.dataset.kind = effect.kind;
        root.dataset.duration = String(effect.duration);
        document.body.append(root);
        const area = viewport();
        const preview = inlineGrowth && document.querySelector(`.exercise-growth[data-growth-exercise="${inlineGrowth.exerciseId}"]`);
        if (preview && visibleRect(preview, area)) {
          inlinePanel = preview;
          preview.classList.add('growth-confirming');
          preview.querySelector('.growth-content').insertAdjacentHTML('beforeend', `<div class="growth-result" aria-hidden="true">${inlineGrowth.result}</div>`);
          if (!reducedMotion && effect.kind !== 'workout') {
            const pose = document.createElement('div');
            pose.className = 'growth-proud-portrait';
            pose.innerHTML = characterMarkup(parts, { bodyType, outfit, back: preview.dataset.back === 'true', expression: 'proud' });
            preview.querySelector('.growth-model').append(pose);
            void paintCharacters(pose);
          }
          timer = setTimeout(finish, effect.duration);
          return;
        }
        if (reducedMotion) { timer = setTimeout(finish, effect.duration); return; }

        const source = origin || captureCelebrationOrigin();
        const scene = document.querySelector('.partner-scene');
        const character = scene?.querySelector('.character');
        const sceneRect = visibleRect(character, area);
        const focus = document.createElement('div');
        focus.className = `celebration-focus${sceneRect ? '' : ' celebration-companion'}`;
        const width = sceneRect ? sceneRect.width : Math.min(180, area.width - 48);
        const height = sceneRect ? sceneRect.height : 240;
        const left = sceneRect ? sceneRect.left : (area.width - width) / 2;
        const top = sceneRect ? sceneRect.top : clamp(area.bottom * .18, 20, Math.max(20, area.bottom - height - 100));
        Object.assign(focus.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });
        if (bodyType === 'studio') {
          root.classList.add('studio-response');
          const portrait = sceneRect ? '' : characterMarkup(parts, { bodyType, back });
          focus.innerHTML = portrait + studioLight(effect.parts, back);
          root.append(focus);
          if (!sceneRect) void paintCharacters(focus);
          timer = setTimeout(finish, effect.duration);
          return;
        }
        const label = effect.kind === 'shape' ? '新しい姿へ！' : effect.kind === 'level' ? 'レベルアップ！' : 'ナイス記録！';
        focus.innerHTML = `<img class="celebration-rays" src="./src/assets/effects/record-rays.svg" alt="">${sceneRect ? '' : characterMarkup(parts, { bodyType, outfit, back, expression: 'cheer' })}<strong class="celebration-call">${label}</strong>`;
        root.append(focus);
        if (!sceneRect) void paintCharacters(focus);

        const targets = effect.parts.map(part => ({ part, element: document.querySelector(`.body-stat[data-id="${part.id}"]`) }));
        // Part panels below the fold get a compact, temporary counterpart.
        // Do not move the user's scroll position just to show an animation.
        const outside = targets.filter(item => !visibleRect(item.element, area));
        if (outside.length) {
          const dock = document.createElement('div');
          dock.className = 'celebration-destinations';
          const toast = document.querySelector('#toast.visible');
          const arrival = visibleRect(document.querySelector('.shape-arrival'), area);
          // The enlarged home keeps its record buttons near the bottom. Use
          // the speech row for the brief XP dock, leaving save/undo and the
          // next record action visible. The row keeps its layout space.
          const copy = document.querySelector('.hero-panel .partner-copy');
          const copyRect = sceneRect && visibleRect(copy, area);
          const heroDock = copyRect && copyRect.height >= 58;
          if (heroDock) { copy.classList.add('celebration-copy'); touched.push(copy); }
          const dockFloor = heroDock ? copyRect.bottom + 16 : arrival && arrival.height >= 80 ? arrival.bottom : toast ? Math.min(area.bottom, toast.getBoundingClientRect().top - 12) : area.bottom;
          dock.style.bottom = `${innerHeight - dockFloor + 16}px`;
          for (const { part } of outside) {
            const tile = document.createElement('span');
            tile.className = 'celebration-part'; tile.dataset.part = part.id;
            tile.innerHTML = `<span>${partName(part.id)}</span><b>+${xpText(part.xp)}<small> XP</small></b>`;
            dock.append(tile);
          }
          root.append(dock);
        }
        targets.forEach(({ part, element }, index) => {
          const actualRect = visibleRect(element, area);
          const destination = actualRect ? element : root.querySelector(`.celebration-part[data-part="${part.id}"]`);
          const rect = actualRect || destination.getBoundingClientRect();
          destination.classList.add('celebration-target'); touched.push(destination);
          const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
          const mote = document.createElement('span');
          mote.className = 'celebration-xp'; mote.dataset.part = part.id;
          mote.textContent = `+${xpText(part.xp)}`;
          const startX = clamp(source.x + (index - (targets.length - 1) / 2) * 24, 36, area.width - 36);
          mote.style.cssText = `left:${startX}px;top:${source.y}px;--flight-x:${x - startX}px;--flight-y:${y - source.y}px;--flight-delay:${30 + Math.min(index, 5) * 18}ms;`;
          root.append(mote);
        });
        if (effect.kind !== 'workout') {
          const flash = document.createElement('div'); flash.className = 'celebration-flash'; root.prepend(flash);
        }
        timer = setTimeout(finish, effect.duration);
      } catch {
        // A visual effect must never turn a completed save into a failure.
        finish();
      }
    });
  }
  return { play, cancel };
}
