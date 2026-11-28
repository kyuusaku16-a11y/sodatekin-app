// Bump this version whenever an app-shell asset changes.
const CACHE = 'sodatekin-app-v0112';
// Reuse the previous cache in place so a catalog update needs no second copy of the 25 MB model/runtime.
const PHOTO_CACHE = 'sodatekin-app-20261118-v094-meal-photo-1';
const ASSETS = [
  './src/xp-label.js', './src/weight-chart.js', './src/spirit.js', './src/calorie-target.js', './src/calorie-view.js', './src/home-view.js', './src/home-diet.css', './src/weights.js', './src/diet-summary.js',
  './src/training-notebook.js', './src/training-notebook-view.js', './src/training-notebook.css',
  './src/studio.css', './src/studio-character.js', './src/assets/character/studio-atlas.webp', './src/assets/scenes/studio.webp',
  './src/wardrobe.js', './src/wardrobe-view.js', './src/wardrobe.css', './src/character-outfit.js',
  './src/journey-scene.js', './src/journey-scene-view.js', './src/journey-scene.css', './src/journey-arrival.js', './src/journey-arrival.css',
  './src/assets/scenes/journey-1.svg', './src/assets/scenes/journey-2.svg', './src/assets/scenes/journey-3.svg', './src/assets/scenes/journey-4.svg', './src/assets/scenes/journey-5.svg', './src/assets/scenes/journey-6.svg', './src/assets/scenes/journey-7.svg', './src/assets/scenes/journey-8.svg',
  './src/workout-growth-view.js', './src/exercise-catalog.js', './src/exercise-search.js', './src/hero.css', './src/character-life.js',
  './src/ingredients.js', './src/ingredient-table.js', './src/ingredient-picker.js', './src/meal-diary.js',
  './src/record-celebration.js', './src/record-celebration-view.js', './src/record-celebration.css', './src/assets/effects/record-rays.svg',
  './src/character-reaction-view.js',
  './src/backup.js', './src/date-inputs.js', './src/workout-set-drafts.js',
  './src/companion-conversation.js', './src/companion-conversation-view.js',
  './src/part-progress.js', './src/part-progress-view.js', './src/part-progress.css',
  './src/growth-focus.js', './src/foods.js', './src/food-catalog.js', './src/food-entry.js', './src/meal-photo.js', './src/meal-photo-foods.js', './src/meal-photo-view.js', './src/meal-photo-worker.js', './src/food-view.js', './src/food.css',
  './', './index.html', './manifest.webmanifest',
  './src/version.js', './src/cosmetics.js', './src/milestones.js', './src/milestone-view.js', './src/comparison.js', './src/record-context.js', './src/milestones.css',
  './src/app.js', './src/model.js', './src/profile.js', './src/rules.js', './src/growth.js', './src/companion.js', './src/personal-bests.js', './src/data-safety.js', './src/insights.js', './src/speech-catalog.js', './src/story-memory.js', './src/collection.js', './src/collection-view.js', './src/forecast.js',
  './src/story-data.js', './src/story.js', './src/story-view.js', './src/story.css',
  './src/body-types.js', './src/body-mesh.js', './src/body-calibration.js', './src/body-type-view.js',
  './src/assets/character/body-types-v1/slim-atlas-v1.webp', './src/assets/character/body-types-v1/natural-atlas-v1.webp', './src/assets/character/body-types-v1/round-atlas-v1.webp',
  './src/character.js', './src/character-mesh.js', './src/character-renderer.js',
  './src/weekly-digest.js', './src/weekly-digest-view.js', './src/weekly-digest.css',
  './src/workout-sets.js', './src/workout-sets-view.js', './src/workout-sets.css',
  './src/journey.js', './src/journey-view.js', './src/timer.js', './src/timer-view.js', './src/offline.js',
  './src/styles.css', './src/home.css', './src/character.css', './src/journey.css', './src/logbook.css',
  './src/assets/character/growth-atlas-v1.png', './src/assets/app-icon.svg',
  './src/assets/app-icon-192.png', './src/assets/app-icon-512.png',
];
// The optional model and runtime enter the offline cache only when photo analysis uses them.
const photoAssets = new Set([
  './src/assets/meal-photo/ort.wasm.min.js', './src/assets/meal-photo/ort-wasm-simd-threaded.js',
  './src/assets/meal-photo/ort-wasm-simd-threaded.wasm', './src/assets/meal-photo/foodseg103.onnx',
].map(asset => new URL(asset, self.registration.scope).href));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key === PHOTO_CACHE) {
        const photos = await caches.open(key);
        for (const request of await photos.keys()) if (!photoAssets.has(request.url)) await photos.delete(request);
      } else if (key.startsWith('sodatekin-app-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => { if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(photoAssets.has(event.request.url) ? PHOTO_CACHE : CACHE);
    const cached = await cache.match(event.request, {ignoreSearch:true});
    if (cached) return cached;
    if (event.request.mode === 'navigate') {
      try { return await fetch(event.request); }
      catch { return await cache.match('./index.html'); }
    }
    const response = await fetch(event.request);
    if (response.ok && photoAssets.has(event.request.url)) {
      try { await cache.put(event.request, response.clone()); } catch { /* The online analysis still works if storage is full. */ }
    }
    return response;
  })());
});
