export const JOURNEY_SCENE_ASSETS = Object.freeze(Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`journey-${i + 1}`, `./src/assets/scenes/journey-${i + 1}.svg`])));
const periods = new Set(['morning', 'day', 'evening', 'night']);

// The garden is also the starting place before a first record. This decorative
// view never treats a background as an earned record, unlock, or XP reward.
export function journeySceneMarkup(scene) {
  if (!scene || typeof scene.id !== 'string' || !Object.hasOwn(JOURNEY_SCENE_ASSETS, scene.id)) return '';
  const period = periods.has(scene.period) ? scene.period : 'day';
  return `<div class="journey-scene journey-scene--${period}${scene.resting ? ' journey-scene--resting' : ''}" data-journey-scene="${scene.id}" aria-hidden="true"><div class="journey-scene-sky"></div><img class="journey-scene-land" src="${JOURNEY_SCENE_ASSETS[scene.id]}" alt="" width="1200" height="600" decoding="async" draggable="false"></div>`;
}
