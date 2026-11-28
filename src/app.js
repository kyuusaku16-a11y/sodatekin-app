import { effectiveTarget } from './calorie-target.js';
import { caloriePreview, calorieSetupFields, profileDraft, profileField } from './calorie-view.js';
import { heroOverlay, recordButtons, calorieCard } from './home-view.js';
import { weightTrend, continuedDays, todayChecks } from './diet-summary.js';
import { latestWeight, parseWeightText, upsertWeight, removeWeight } from './weights.js';
import { xpSummaryLabel } from './xp-label.js';
import { findExercises, recentExerciseIds, recentExerciseDays as sortedExerciseDays } from './exercise-search.js';
import { notebookPages } from './training-notebook.js';
import { notebookOnBench, notebookContent } from './training-notebook-view.js';
import { EXERCISE_GROUPS, countStep, exerciseById, exerciseGroup, exercisesFor, validateCustomExercises } from './exercise-catalog.js';
import { RULES, PARTS } from './rules.js';
import { STORAGE_KEY, today, shiftDate, derive, emptyState, validateState, clone, id, makeWorkout, lastWorkout, makeMeal, mealDetail, withinInputWindow } from './model.js';
import { BREAKFAST, mealNutrition, nutrientText, portionLabel } from './foods.js';
import { MEAL_SLOTS, mealSlotLabel, suggestedMealSlot, reusableMeals, previousMeal } from './meal-diary.js';
import { mountMealPhoto } from './meal-photo-view.js';
import { findIngredients } from './ingredients.js';
import { mountIngredientPicker } from './ingredient-picker.js';
import { matchingFood, registerAndRecordFood } from './food-entry.js';
import { foodGroup, foodFilters, foodMatches, foodResults, dailyNutrition, nutritionFields, foodFormValues, foodSetRows, portionField, portionPreview, mealEntryCard, mealSlotField, mountMealReuse } from './food-view.js';
import { characterSVG, icon, paintCharacters } from './character.js';
import { partShape, clampShape, SHAPE_ANCHORS, SHAPE_NAMES } from './character-mesh.js';
import { recordFeedback, recentFeedback, companionVoice } from './companion.js';
import { journeyOf, weekOf, newestHistoryFirst } from './journey.js';
import { journeyPage, journeyPeek, exerciseHistoryContent, dayHistoryScrollOffset } from './journey-view.js';
import { createRestTimer } from './timer-view.js';
import { offlineState, watchOffline, enableOffline, installApp, updateOffline, checkOfflineUpdate } from './offline.js';
import { APP_VERSION } from './version.js';
import { SCENES, TITLE_BADGE } from './cosmetics.js';
import { milestonesOf, newlyEarnedRewards } from './milestones.js';
import { milestoneContent, backgroundModeOptions } from './milestone-view.js';
import { settingsOnlyChange, undoRecordWithSettings } from './record-context.js';
import { captureComparison } from './comparison.js';
import { PROFILE_FIELDS, emptyProfile, profileFromForm } from './profile.js';
import { personalBests, personalBestLabel } from './personal-bests.js';
import { rememberVoice, mergeCollections } from './collection.js';
import { growthForecast, workoutGrowth } from './forecast.js';
import { growthContent, growthPreviewView, growthSummaryText } from './workout-growth-view.js';
import { storyOf } from './story.js';
import { sceneMode, sceneFor, newlyReachedScene, earnedSceneIds } from './journey-scene.js';
import { journeySceneMarkup } from './journey-scene-view.js';
import { wardrobeOf, wardrobeProgress, outfitFor } from './wardrobe.js';
import { wardrobeEntry, wardrobeContent } from './wardrobe-view.js';
import { createJourneyArrivalPlayer } from './journey-arrival.js';
import { storyPeek, storyContent, pinnedSouvenir } from './story-view.js';
import { bodyTypeOptions, bodyTypePreview } from './body-type-view.js';
import { growthFocus } from './growth-focus.js';
import { recordCelebration } from './record-celebration.js';
import { captureCelebrationOrigin, createCelebrationPlayer } from './record-celebration-view.js';
import { weeklyDigest } from './weekly-digest.js';
import { weeklyDigestView } from './weekly-digest-view.js';
import { companionConversation } from './companion-conversation.js';
import { conversationContent } from './companion-conversation-view.js';
import { partProgressView } from './part-progress-view.js';
import { createWorkoutSetDraft, addWorkoutSetRow, removeWorkoutSetRow, makeWorkoutSetRecords, parseWorkoutWeight, previousDaySet, previousWorkoutSetSummary, createPreviousWorkoutSetDraft } from './workout-sets.js';
import { workoutSetsView, readWorkoutSetDraft, focusWorkoutSetField, previousWorkoutSetsEntry } from './workout-sets-view.js';
import { createWorkoutSetDraftStore } from './workout-set-drafts.js';
import { needsPersistence, requestPersistence, shouldSuggestInstall, shouldRemindBackup, isIOSSafari, dataSafetyAfterRestore } from './data-safety.js';
import { readBackupFile, serializeBackup } from './backup.js';
import { studioReactionBack, studioVisibleParts } from './studio-character.js';
import { dateInputLimits, refreshDateInputs, refreshWorkoutSetDateLabels } from './date-inputs.js';

let restTimer, modalOrigin = null;
const $ = selector => document.querySelector(selector);
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = value => new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 1 }).format(value);
const partName = id => PARTS.find(p => p.id === id)?.name || '';
const exById = id => exerciseById(state, id);
const shortDate = date => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
const labelDate = date => date === today() ? '今日' : date === shiftDate(today(), -1) ? '昨日' : shortDate(date);
let state = emptyState(), sourceRaw = null, storageError = '';
try { sourceRaw = localStorage.getItem(STORAGE_KEY); if (sourceRaw) state = validateState(JSON.parse(sourceRaw)); }
catch { storageError = '保存データを読み込めませんでした。元のデータを保護しています。設定から書き出し・復元してください。'; }
const tabs = ['home', 'food', 'workout', 'journey'];
let tab = tabs.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home', back = false, activeParts = [], undoState = null, toastTimer, animationTimer, pendingConfirm;
let bestCache = null;
function currentBests() {
  if (bestCache?.state !== state || bestCache.date !== today()) bestCache = { state, date: today(), values: personalBests(state) };
  return bestCache.values;
}
function bestBadge(best, unit) { return best ? `<span class="personal-best">${icon('star')}${personalBestLabel(best, unit)}</span>` : ''; }
let displayedVoice = null;
let feedback = null, feedbackCache = null, feedbackState = null, feedbackDate = null;
const quickTaps = new Map();
function repeatedQuickTap(action, itemId) {
  const key = `${action}:${itemId}:${tab === 'food' ? selectedMealSlot : ''}`, now = performance.now();
  if (now - (quickTaps.get(key) ?? -Infinity) < 650) return true;
  quickTaps.set(key, now);
  return false;
}
let summary = derive(state);
let previewStages = null, previewBack = false, bodyTypeBack = false;
let wardrobeBack = false, wardrobeOrigin = 'milestones';
let lastDate = today();
let comparisonBack = false, memoryLimit = 12, journeyCache = null;
let receiptExpanded = false, recordComparison = null, compareBefore = false, earnedNow = [], recordUndoState = null, undoWasSettings = false;
let digestCache = null, digestOffset = 0, digestBack = false;
let homeTodayExpanded = false, conversationOffset = 0;
let recordReaction = null, pendingSceneArrival = null;
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const reducedMotion = () => state.settings.reducedMotion || motionPreference.matches;
const lifeVisibility = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
  for (const entry of entries) entry.target.classList.toggle('life-paused', !entry.isIntersecting || entry.intersectionRatio <= .1 || $('#modal').open);
}, { threshold: [0, .1] }) : null;
function observeLivingCharacters() {
  lifeVisibility?.disconnect();
  for (const character of document.querySelectorAll('#app .character.is-living')) {
    character.classList.toggle('life-paused', !!lifeVisibility || $('#modal').open);
    if (!$('#modal').open) lifeVisibility?.observe(character);
  }
}
document.documentElement.classList.toggle('page-hidden', document.hidden);
const arrivalPlayer = createJourneyArrivalPlayer({ onFinish: () => { if (tab === 'home') render(); } });
function playSceneArrival() {
  const arrival = pendingSceneArrival;
  if (!arrival) return;
  // Batch forms finish their own synchronous render after commit returns.
  queueMicrotask(() => {
    if (pendingSceneArrival !== arrival || recordReaction) return;
    pendingSceneArrival = null;
    if (sceneMode(state.settings) !== 'journey' || earnedSceneIds(state).at(-1) !== arrival.id) return;
    try { arrivalPlayer.play(arrival, { reducedMotion: reducedMotion() }); }
    catch { arrivalPlayer.cancel(); }
  });
}
const celebrationPlayer = createCelebrationPlayer({ onFinish: () => {
  recordReaction = null; activeParts = [];
  if (tab === 'home') render();
  playSceneArrival();
} });
function stopRecordCelebration(redraw = false) {
  const wasPlaying = !!recordReaction;
  celebrationPlayer.cancel(); recordReaction = null;
  arrivalPlayer.cancel(); pendingSceneArrival = null;
  if (wasPlaying) { activeParts = []; if (redraw && tab === 'home') render(); }
}
const workoutDrafts = createWorkoutSetDraftStore();
let timerDraftExercise = null;
let exercisePart = '', exerciseQuery = '', selectedExercise = '', historyLimit = 30;
let flippedGrowthExercise = '';
const openExerciseGroups = new Set();
let customOnly = false;
let foodQuery = '', foodCategory = '', expandedFoods = false, foodBrowseOpen = false, disposeMealPhoto = null;
let selectedMealSlot = suggestedMealSlot();
const setDraftFoods = new WeakMap();
let activePartDetail = null, partHistoryLimit = 30;
let calendarHistoryDay = null;
let historyFilters = { query: '', kind: '', from: '', to: '' };
const matchesQuery = (text, query) => query.normalize('NFKC').toLowerCase().trim().split(/\s+/).every(word => text.normalize('NFKC').toLowerCase().includes(word));
function currentJourney() {
  const date = today();
  if (journeyCache?.state !== state || journeyCache.date !== date) journeyCache = { state, date, journey: journeyOf(state, date, summary), week: weekOf(state, date), milestones: milestonesOf(state, date), story: storyOf(state, date) };
  return journeyCache;
}
function recentExerciseDays() {
  const cache = currentJourney();
  return cache.exerciseDays ||= sortedExerciseDays(state, cache.date);
}
function currentNotebook() {
  const cache = currentJourney();
  return cache.notebook ||= summary.workoutDays > 0 ? notebookPages(recentExerciseDays(), state) : [];
}
function notebookModal(id) {
  const pages = currentNotebook(), page = pages.find(p => p.exercise.id === id) || pages[0];
  if (page) openModal('ふたりの練習ノート', '', notebookContent(pages, page));
}
function exerciseHistoryModal(id) {
  openModal('種目別の記録', '実際にできた回数や秒数を、記録した日ごとに。', exerciseHistoryContent(recentExerciseDays(), id, state));
}

function currentDigest(offset = 0) {
  const date = today();
  if (digestCache?.state !== state || digestCache.date !== date) digestCache = { state, date, weeks: new Map() };
  if (!digestCache.weeks.has(offset)) digestCache.weeks.set(offset, weeklyDigest(state, { weekOffset: offset, today: date }));
  return digestCache.weeks.get(offset);
}
function clearComparison() { receiptExpanded = false; stopRecordCelebration(); recordComparison = null; compareBefore = false; earnedNow = []; recordUndoState = null; }

function captureWorkoutDraft() {
  const form = $('#workout-sets-form');
  if (!form || form.dataset.draftCleared || !exById(form.dataset.exercise)) return false;
  workoutDrafts.put(readWorkoutSetDraft(form), state);
  return true;
}
function workoutDraftEntries() {
  const drafts = workoutDrafts.list().filter(draft => exById(draft.exerciseId));
  if (!drafts.length) return '';
  return `<section class="workout-drafts" aria-label="入力途中の筋トレ"><p>入力の続き <small>まだ記録していません</small></p><div>${drafts.map(draft => button('workout-resume', `${esc(exById(draft.exerciseId).name)} <span>${draft.rows.length}セットの下書き →</span>`, { id: draft.exerciseId, class: 'button button-light' })).join('')}</div></section>`;
}
function openPreviousWorkout(exerciseId) {
  try { workoutSetsModal(workoutDrafts.get(exerciseId) || createPreviousWorkoutSetDraft(state, exerciseId)); }
  catch (error) { if ($('#modal form')) formError($('#modal form'), error.message); else toast(error.message); }
}

function button(action, label, options = {}) {
  return `<button type="button" data-action="${action}" ${options.id ? `data-id="${esc(options.id)}"` : ''} class="${options.class || 'button'}" ${options.label ? `aria-label="${esc(options.label)}"` : ''}>${options.icon ? icon(options.icon) : ''}${label}</button>`;
}
function sectionTitle(kicker, title, extra = '') { return `<div class="section-heading"><h2>${title}</h2>${extra}</div>`; }
function progress(value, max, label, className = '') { return `<div class="progress ${className}" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${value}"><span style="--progress:${Math.min(100, value / max * 100)}%"></span></div>`; }
function dateFields(date, original = null, label = '実施日') {
  const { min, max } = dateInputLimits(today(), original);
  return `<label class="field">${label}<input type="date" name="date" value="${date}" min="${min}" max="${max}"${original ? ` data-original-date="${original}"` : ''} required></label>`;
}
function header() {
  return `<aside class="sidebar"><a href="#" class="brand" data-action="home"><span class="brand-mark">${icon('dumbbell')}</span><span>そだて筋</span></a>
    <p class="sidebar-tagline">ひとがんばりで、<br>ちょっと頼もしく。</p>
    <nav class="navigation" aria-label="メインナビゲーション">${[['home', '今日', 'sprout'], ['food', '食事', 'meal'], ['workout', '筋トレ', 'dumbbell'], ['journey', 'あゆみ', 'history']].map(([id, label, i]) => `<button type="button" data-action="tab" data-id="${id}" class="nav-item ${tab === id ? 'active' : ''}" ${tab === id ? 'aria-current="page"' : ''}>${icon(i)}<span>${label}</span>${icon('chevron', 'nav-arrow')}</button>`).join('')}</nav>
    <div class="sidebar-bottom"><div class="local-note"><span class="status-dot"></span>このブラウザに保存中</div>${button('settings', '設定とバックアップ', { class: 'sidebar-settings', icon: 'settings' })}<span class="version">相棒との、小さな積み重ね。<br>個人用プロトタイプ · v${APP_VERSION}</span></div></aside>
    <header class="mobile-header"><a href="#" class="brand" data-action="home"><span class="brand-mark">${icon('dumbbell')}</span>そだて筋</a><div class="mobile-tools">${button('history', icon('history'), { class: 'icon-button', label: '記録を見る' })}${button('settings', icon('settings'), { class: 'icon-button', label: '設定とバックアップ' })}</div></header>`;
}
function pageHeading(title, subtitle) {
  const date = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date());
  return `<header class="page-heading"><div><div class="date-line">${icon('calendar')}<time datetime="${today()}">${date}</time><span class="tiny-tag">JST</span></div><h1>${title}</h1><p>${subtitle}</p></div>${button('history', '記録を見る', { class: 'button button-light history-button', icon: 'history' })}</header>`;
}
function homeBackdrop() {
  if (sceneMode(state.settings) === 'studio') return '<div class="studio-backdrop" aria-hidden="true"></div>';
  const scene = sceneFor(state, { story: currentJourney().story });
  return scene ? `${journeySceneMarkup(scene)}<span class="journey-location">${scene.earned ? `第${scene.number}話 · ` : ''}${esc(scene.title)}</span>` : '<div class="partner-circle"></div>';
}
function refreshSceneTime() {
  if (document.hidden || tab !== 'home') return;
  const world = $('.journey-scene');
  if (!world) return;
  const scene = sceneFor(state, { story: currentJourney().story });
  if (!scene || world.classList.contains(`journey-scene--${scene.period}`)) return;
  for (const period of ['morning', 'day', 'evening', 'night']) world.classList.toggle(`journey-scene--${period}`, scene.period === period);
}
function homeSpeech(line, classes = '', expandable = true) {
  if (!expandable || line.length <= 36) return `<p class="partner-speech ${classes}">${esc(line)}</p>`;
  const end = line.slice(0, 32).lastIndexOf('。');
  const short = end >= 15 ? line.slice(0, end + 1) : `${line.slice(0, 30)}…`;
  return button('home-speech', `${esc(short)}<span>続きを読む ${icon('chevron')}</span>`, { class: `partner-speech partner-speech-expand ${classes}`, label: '相棒のことばを全文読む' });
}
function characterCard(overlay) {
  const rests = summary.paused || state.restDays.includes(today());
  const milestones = currentJourney().milestones;
  const arrival = earnedNow.some(r => r.days === 14) ? milestones.arrivalLine : null;
  const voice = companionVoice(state, summary, visibleFeedback(), today(), arrival);
  const shownBack = recordReaction?.studioBack ?? back;
  const visibleParts = state.settings.bodyType === 'studio' ? studioVisibleParts(shownBack) : [];
  const focus = growthFocus(visibleFeedback(), today(), { resting: rests, visibleParts });
  displayedVoice = voice;
  const pages = currentNotebook();
  const featuredId = voice.returnExerciseId || feedback?.notebookExerciseId;
  const notebookPage = pages.find(page => page.exercise.id === featuredId) || pages[0];
  const expression = recordReaction && !recordReaction.reducedMotion ? 'cheer' : reducedMotion() && voice.expression === 'proud' ? 'normal' : voice.expression;
  let speechMarkup = homeSpeech(voice.line, arrival ? 'arrival-speech' : '');
  if (voice.returnExerciseId) {
    const id = voice.returnExerciseId, previous = previousWorkoutSetSummary(state, id);
    const draft = workoutDrafts.has(id);
    const action = draft ? 'workout-resume' : previous?.copyable && previous.recordCount > 1 ? 'workout-previous-sets' : 'workout-form';
    speechMarkup = button(action, `${esc(voice.line)}<span>${draft ? '入力の続きを開く' : '前回の内容から入力'} ${icon('chevron')}</span>`, { id, class: 'partner-speech return-workout' });
  }
  return `<section class="partner-panel hero-panel scene-${milestones.scene}" aria-label="相棒と最近の記録">
    <div class="partner-heading">${button('partner-name', esc(state.settings.partnerName) + icon('edit'), { class: 'partner-name', label: '相棒の名前を変更' })}
      ${rests ? '<span class="partner-condition">ひと休み中</span>' : ''}${milestones.titleVisible ? `<span class="partner-title">${icon('star')}${TITLE_BADGE}</span>` : ''}
      ${button('turn', icon('turn') + (back ? '正面へ' : '後ろ姿'), { class: 'text-button diet-turn' })}
      ${button('history', '記録を見る', { class: 'text-button hero-history', icon: 'history' })}</div>
    <div class="partner-scene"${voice.spirit ? ` data-spirit="${voice.spirit}"` : ''}>${homeBackdrop()}${button('body-type', '姿を選ぶ', { class: 'partner-shape-link' })}
      ${characterSVG(summary.parts, { bodyType: state.settings.bodyType, back: shownBack, expression, outfit: outfitFor(state, summary.parts), living: !recordReaction && !reducedMotion(), active: !recordReaction && !reducedMotion() ? activeParts : [] })}
      ${pinnedSouvenir(currentJourney().story)}${notebookPage ? notebookOnBench(notebookPage, notebookPage.exercise.id === voice.returnExerciseId) : ''}${overlay}</div>
    <div class="partner-copy">${focus ? growthFocusMarkup(focus) : ''}${speechMarkup}</div></section>`;
}
function growthFocusMarkup(focus) {
  const label = focus.meal ? '食事ボーナスが届いた部位' : focus.date !== today() ? `${shortDate(focus.date)}の記録で育った部位` : focus.current ? '今回育った部位' : '今日の記録で育った部位';
  return `<div class="partner-growth-focus"><span>${label}</span>${button('part', `<strong>${focus.name}</strong><b><small>Lv.</small>${focus.to}</b>${icon('chevron')}`, { id: focus.id, class: 'growth-focus-part', label: `${focus.name} レベル${focus.to}、今回プラス${num(focus.xp)}XP。部位の成長を見る` })}<p>+${num(focus.xp)} XP${focus.levelUp ? ' <span role="img" aria-label="レベルアップ" title="レベルアップ">↑</span>' : ''}</p></div>`;
}
function stageArrival() {
  if (!feedback?.current || !feedback.stageChanges?.length) return '';
  return `<div class="shape-arrival" role="status"><div><strong>相棒の体形が、新しい段階へ。</strong><p>${feedback.stageChanges.map(p => `${p.name}：${SHAPE_NAMES[p.from]} → ${SHAPE_NAMES[p.to]}`).join(' / ')}</p></div>${recordComparison ? button('journey-compare', '変化の前を見る', { id: 'before', class: 'text-button' }) : ''}${button('dismiss-stage', icon('close'), { class: 'icon-button', label: '体形の案内を閉じる' })}</div>`;
}
function visibleFeedback() {
  if (feedback) return feedback;
  if (feedbackState !== state || feedbackDate !== today()) { feedbackState = state; feedbackDate = today(); feedbackCache = recentFeedback(state); }
  return feedbackCache;
}
function receiptXP(result) {
  if (result.kind === 'edit') {
    if (!result.totalXP) return '';
    return `訂正による差分 ${result.totalXP > 0 ? '+' : '−'}${num(Math.abs(result.totalXP))}XP`;
  }
  if (result.kind === 'meal' && !result.totalXP) return result.note;
  if (result.kind !== 'workout' && result.kind !== 'meal') return '';

  // 同じXPの部位は、種目の主部位・補助部位の表示順にそろえる。
  let changes = result.changes;
  if (result.kind === 'workout' && changes.length) {
    const record = state.workouts.find(row => row.id === result.recordIds[0]);
    const ex = exById(record.exerciseId);
    const order = [...ex.primary, ...ex.secondary];
    changes = [...changes].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  }
  return xpSummaryLabel(changes).replace(/^今日/, labelDate(result.date));
}

function feedbackPanel() {
  const result = visibleFeedback();
  if (!result && (summary.paused || state.restDays.includes(today()))) return `<div class="record-receipt receipt-empty"><span>${icon('moon')}</span><p><strong>今日は、一緒にひと休み。</strong><span>獲得したレベルは、そのままです。</span></p></div>`;
  if (!result) return '';
  const levels = result.changes.filter(p => p.from !== p.to);
  const editable = result.recordIds?.length === 1 && [...state.workouts, ...state.meals, ...state.weights].some(r => r.id === result.recordIds[0]);
  const editLink = editable ? button('edit-record', '編集', { id: result.recordIds[0], class: 'receipt-edit', label: 'この記録の内容を編集' }) : result.recordIds?.length > 1 ? button('receipt-history', '確認', { class: 'receipt-edit', label: 'この日の記録を確認・編集' }) : '';
  const actions = `<div class="receipt-actions">${editLink}${feedback && recordUndoState ? button('undo-record', '取り消す', { class: 'receipt-undo', label: '直前の記録を取り消す' }) : button('history', '履歴', { class: 'receipt-undo' })}</div>`;
  const detail = `${labelDate(result.date)} · ${esc(result.detail)}`;
  const breakdown = `${result.changes.length ? `<p class="receipt-gains">${result.changes.map(p => `<span>${p.name} <b>${p.xp > 0 ? '+' : '−'}${num(Math.abs(p.xp))}</b></span>`).join('')}<small>XP</small></p>` : `<p class="receipt-note">${result.kind === 'workout' ? 'この日の獲得上限に到達 · 履歴には保存済み' : result.kind === 'meal' ? esc(result.note) : '記録を反映しました'}</p>`}${result.kind === 'meal' && result.totalXP > 0 ? `<p class="receipt-note">${esc(result.note)}</p>` : ''}${bestBadge(result.personalBest, result.unit)}${result.changedPartsAtMax ? '<p class="receipt-note">今回の部位は最大体形。XPと記録は積み重なっています。</p>' : ''}${levels.length ? `<p class="receipt-levels">${levels.map(p => `<span>${p.name} <b>Lv.${p.from} → ${p.to}</b></span>`).join('')}</p>` : ''}${result.current && !back && result.changes.some(p => ['back', 'glutes'].includes(p.id) && p.xp > 0) ? button('show-back', '背中・お尻を後ろから見る', { class: 'receipt-back' }) : ''}${earnedNow.length ? button('milestones', `${earnedNow.map(r => ({ 7: '7日・タオル', 30: '30日・リストバンド', 100: '100日・新色ウェア' })[r.days] || `${r.days}日の記念`).join(' / ')}が届きました →`, { class: 'receipt-reward' }) : ''}`;
  const title = `<div class="receipt-title">${icon('check')}<strong>${esc(result.label)}</strong></div>`;
  if (result.current) {
    const gain = receiptXP(result);
    return `<div class="record-receipt record-confirmation current-receipt ${result.totalXP > 0 ? 'receipt-growth' : ''}"><div class="receipt-heading"><div role="status">${title}<p class="receipt-detail">${detail}</p>${gain ? `<p class="receipt-xp">${esc(gain)}</p>` : ''}</div>${actions}</div>${result.notebookExerciseId ? button('notebook', `${esc(exById(result.notebookExerciseId).name)}${result.notebookBookmark ? 'の3日目にしおりを挟みました' : 'の最初の一行を読み返す'} ›`, { id:result.notebookExerciseId, class:'text-button notebook-receipt' }) : ''}<details class="receipt-breakdown" ${receiptExpanded ? 'open' : ''}><summary>記録の内訳</summary>${breakdown}</details></div>`;
  }
  // 記録直後と同じ1行（例：今日 +20XP（胸10・肩5・腕5））で見せる。減ったXPを含むときは従来の内訳のまま。
  const gainsOnly = result.changes.length > 0 && result.changes.every(p => p.xp > 0);
  const recent = gainsOnly ? `<p class="receipt-xp">${esc(receiptXP(result))}</p>${breakdown.replace(/^<p class="receipt-gains">[\s\S]*?<\/p>/, '')}` : breakdown;
  return `<div class="record-receipt ${result.totalXP > 0 ? 'receipt-growth' : ''}"><div class="receipt-heading">${title}${actions}</div><p class="receipt-detail">最近の記録 · ${detail}</p>${recent}</div>`;
}
function partGrid() {
  const changed = visibleFeedback()?.changes.filter(p => p.xp > 0).map(p => p.id) || [];
  return `<section class="body-status">${sectionTitle('', 'からだの成長')}<div class="body-grid">${PARTS.map(p => {
    const item = summary.parts[p.id];
    return `<button class="body-stat ${changed.includes(p.id) ? 'recent-growth' : ''} ${activeParts.includes(p.id) ? 'gained' : ''}" data-action="part" data-id="${p.id}" aria-label="${p.name} レベル${item.level}、経験値${num(item.progress)}/${item.nextXP}"><span class="body-name">${p.name}</span><span class="body-level"><small>Lv.</small><strong>${item.level}</strong></span>${progress(item.progress, item.nextXP, `${p.name}の経験値`)}</button>`;
  }).join('')}</div><div class="status-summary"><span>今日 <b>+${num(summary.todayXP)}XP</b></span><span>一緒に鍛えて <b>${summary.workoutDays}日</b></span><span class="meal-indicator ${summary.mealBonus ? 'enabled' : ''}">${icon('meal')}${summary.mealBonus ? summary.todayWorkouts.length ? '食事ボーナス +10%' : '食事を記録済み' : '食事の記録なし'}</span></div></section>`;
}
// Keep the count and its weight together while another tab updates the training history.
const quickSetDrafts = new Map();
function weightStep(reference) {
  // Imported weights may be more precise than the normal 0.1 kg entry step.
  return Number.isInteger(Number(reference) * 10) ? '0.1' : 'any';
}
function workoutListReceipt(ex, record) {
  if (!record || record.date !== today()) return '';
  const current = feedback?.current && feedback.recordIds?.length === 1 && feedback.recordIds[0] === record.id;
  const justSaved = current && feedback.kind === 'workout';
  const justEdited = current && feedback.kind === 'edit';
  const gains = justSaved ? feedback.changes.filter(part => part.xp > 0).map(part => `${part.name} +${num(part.xp)}XP${part.to > part.from ? `（Lv.${part.to}到達）` : ''}`).join('・') : '';
  const amount = `${record.weight !== null ? `${record.weight}kg × ` : ''}${record.count}${ex.unit} × ${record.sets}セット`;
  const undoLabel = justEdited ? '訂正を取り消す' : '取り消す';
  const undo = (justSaved || justEdited) && recordUndoState ? button('undo-record', undoLabel, { class:'inline-undo', label:`${ex.name}の${justEdited ? '訂正' : '直前の記録'}を取り消す` }) : '';
  const notebook = justSaved && feedback.notebookExerciseId ? button('notebook', '相棒のノートを開く ›', { id:ex.id, class:'inline-notebook' }) : '';
  return `<div class="inline-set-receipt" ${undo ? 'data-current-receipt' : ''}><div class="inline-set-summary" role="status"><span>${icon('check')} ${justEdited ? '訂正済み' : '記録済み'}</span><strong>${amount}</strong>${justSaved ? `<small>${gains || '本日の部位XPは上限'}</small>` : ''}</div><div class="inline-set-tools">${button('edit-record', '編集', { id:record.id, class:'inline-edit', label:`${ex.name}の直近の記録を編集` })}${undo}${notebook}</div></div>`;
}
function oneSetGrowthView(ex) {
  return growthPreviewView(ex, workoutGrowth(state, summary, ex), summary.parts, {
    bodyType: state.settings.bodyType, outfit: outfitFor(state, summary.parts), flipped: flippedGrowthExercise === ex.id,
  });
}
function quickSetCard(ex, inList = false) {
  const last = lastWorkout(state, ex.id);
  const todayRows = summary.todayWorkouts.filter(record => record.exerciseId === ex.id);
  const todaySets = todayRows.reduce((sum, record) => sum + record.sets, 0);
  const draft = workoutDrafts.get(ex.id);
  const previous = last && !todaySets && !draft ? previousWorkoutSetSummary(state, ex.id) : null;
  const matched = last && !draft ? previousDaySet(state, ex.id, todaySets + 1) : null;
  const suggested = matched || last;
  const pending = quickSetDrafts.get(ex.id);
  const typed = pending?.date === today() ? pending : null;
  const source = typed ? typed.source : suggested;
  const value = typed ? typed.count : source?.count ?? ex.count;
  const weight = typed ? typed.weight : source?.weight ?? '';
  const showWeight = ex.usesWeight || source?.weight != null || last?.weight != null || weight !== '';
  const unit = ex.unit, measure = unit === '秒' ? '秒数' : '回数';
  const weightLabel = exerciseGroup(ex) === 'weighted' ? '追加重量' : '重量';
  const changedSource = source?.id !== suggested?.id || source?.count !== suggested?.count || source?.weight !== suggested?.weight;
  const basis = changedSource ? '入力開始時' : matched ? `前回の${todaySets + 1}セット目` : '直前';
  const previousText = source ? `${basis}　${source.weight !== null ? `${source.weight}kg × ` : ''}${source.count}${unit}` : '';
  const todayLink = todaySets && (!inList || todayRows.length > 1) ? button('today-workouts', `今日 ${todaySets}セット ›`, { id:ex.id, class:'set-today', label:`${ex.name}の今日の記録を${todayRows.length === 1 ? '編集' : '確認'}` }) : '';
  const detailLabel = !last && ex.sets > 1 ? `${ex.sets}セット分を入力` : '詳細';
  const details = button('workout-form', detailLabel, { id:ex.id, class:'set-details', label:`${ex.name}の${detailLabel}（セット数・日付・重さを変更できます）` });
  let controls;
  if (draft) {
    controls = button('workout-resume', `${draft.rows.length}セットの入力を再開 ›`, { id:ex.id, class:'set-submit' });
  } else {
    const hasMultipleRows = !todaySets && previous?.copyable && previous.recordCount > 1;
    const repeat = hasMultipleRows ? button('workout-previous-sets', `前回の${previous.sets}セットを確認 ›`, { id:ex.id, class:'set-repeat' })
      : last?.sets > 1 ? button('quick-workout', `前回の${last.weight !== null ? `${last.weight}kg × ` : ''}${last.count}${unit} × ${last.sets}セットをまとめて記録`, { id:ex.id, class:'set-repeat' }) : '';
    const weightField = showWeight ? `<label class="set-weight-field"><span>${weightLabel} <small>kg</small></span><input name="weight" type="text" inputmode="decimal" autocomplete="off" data-original="${source?.weight ?? ''}" aria-describedby="quick-weight-error-${ex.id}" aria-label="${esc(ex.name)}の${weightLabel}（kg、任意）" value="${esc(weight)}" placeholder="任意"></label>` : '';
    controls = `<form class="quick-set-form${showWeight ? ' with-weight' : ''}" data-exercise="${ex.id}" data-date="${today()}" data-source-id="${esc(source?.id ?? '')}">
      ${weightField}<div class="set-reps-field">${showWeight ? `<span class="set-field-title">${measure}</span>` : ''}
      <div class="set-stepper"><button type="button" data-action="count-down" data-id="${ex.id}" aria-label="${esc(ex.name)}を${countStep(unit)}${unit}減らす">−</button>
      <label class="set-count"><input type="number" data-quick-count="${ex.id}" name="count" aria-label="${esc(ex.name)}のできた${measure}" inputmode="numeric" min="1" max="86400" step="1" required value="${esc(value)}" placeholder="${measure}"><span>${unit}</span></label>
      <button type="button" data-action="count-up" data-id="${ex.id}" aria-label="${esc(ex.name)}を${countStep(unit)}${unit}増やす">＋</button></div></div><output class="sr-only" aria-live="polite"></output>
      <button type="submit" class="set-submit" aria-label="${esc(ex.name)}を1セット記録"><span>1セット</span>記録</button>
    </form>${showWeight ? `<p class="quick-weight-error" id="quick-weight-error-${ex.id}" hidden>重量は0〜2000kg、小数1桁までで入力してください。</p>` : ''}${repeat}`;
  }
  const referenceDate = inList && source?.date ? `<time datetime="${source.date}">${labelDate(source.date)}</time> · ` : '';
  const referenceText = previousText ? referenceDate + previousText : !draft ? `初回の目安　${ex.count}${unit} × ${ex.sets}セット` : '';
  const reference = referenceText ? `<p class="set-reference">${referenceText}</p>` : '';
  const heading = inList ? `<strong class="list-set-number">${draft ? '入力の続き' : `${todaySets + 1}セット目を入力`}</strong>` : `<strong>${esc(ex.name)}</strong>`;
  const growth = inList && !draft ? oneSetGrowthView(ex) : '';
  return `<div class="quick-set-card"><div class="set-heading">${heading}<div>${todayLink}${draft ? '' : details}</div></div>${reference}${controls}${inList ? workoutListReceipt(ex, last) : ''}${growth}</div>`;
}
function readQuickWeight(form) {
  const field = form.elements.weight;
  return field ? parseWorkoutWeight(field.value, field.dataset.original || null) : null;
}
function validateQuickSet(form) {
  const count = form.elements.count, weight = form.elements.weight;
  if (weight) {
    const invalid = Number.isNaN(readQuickWeight(form));
    const error = document.getElementById(weight.getAttribute('aria-describedby'));
    error.hidden = !invalid;
    weight.setCustomValidity(invalid ? error.textContent : '');
    weight.setAttribute('aria-invalid', String(invalid));
  }
  form.querySelector('[data-action=count-down]').disabled = !Number.isFinite(count.valueAsNumber) || count.valueAsNumber <= 1;
  form.querySelector('[data-action=count-up]').disabled = count.valueAsNumber >= 86400;
  form.querySelector('[type=submit]').disabled = !count.validity.valid || Boolean(weight && !weight.validity.valid);
}
function updateQuickSet(form) {
  const exerciseId = form.dataset.exercise, prior = quickSetDrafts.get(exerciseId);
  const source = prior?.date === form.dataset.date ? prior.source : state.workouts.find(record => record.id === form.dataset.sourceId);
  const count = form.elements.count, weight = form.elements.weight;
  quickSetDrafts.set(exerciseId, { date:form.dataset.date, source, count:count.value, weight:weight?.value ?? '' });
  validateQuickSet(form);
}
function workoutSheet() {
  const cards = state.settings.favorites.map(id => quickSetCard(exById(id))).join('');
  openModal('筋トレを記録', '', `<div class="workout-sheet"><div class="quick-set-grid">${cards}</div>
    <div class="training-help">${button('favorites', '種目を入れ替える', { class: 'text-button' })}${button('tab', 'すべての種目 →', { id: 'workout', class: 'text-button' })}</div>
    ${workoutDraftEntries()}</div>`);
  document.querySelectorAll('#modal .quick-set-form').forEach(validateQuickSet);
}
function recordsList(records, compact = false, inMealGroup = false) {
  if (!records.length) return `<div class="empty-state">${icon('sprout')}<p>まだ、まっさらな1ページ。</p><span>記録すると、ここに積み重なっていきます。</span></div>`;
  return `<div class="record-list">${records.map(r => {
    const workout = r.kind === 'workout';
    const ex = workout ? exById(r.exerciseId) : null;
    const title = workout ? ex.name : r.kind === 'rest' ? '休養日の記録' : r.name;
    const detail = workout ? `${r.count}${ex.unit} × ${r.sets}セット${r.weight !== null ? ` · ${num(r.weight)}kg` : ''}`
      : r.kind === 'rest' ? 'ゆっくり整える日。' : r.kind === 'weight' ? '' : (inMealGroup ? '' : mealSlotLabel(r.mealSlot) + ' · ') + mealDetail([r]);
    const description = esc(detail) + (compact ? '' : `${detail ? ' · ' : ''}<span class="record-date">${labelDate(r.date)}</span>`);
    const symbol = workout ? ex.icon : r.kind === 'rest' ? 'moon' : r.kind === 'weight' ? 'history' : 'meal';
    return `<div class="record-row" data-kind="${esc(r.kind)}"><span class="record-icon ${r.kind === 'food' ? 'food' : ''}">${icon(symbol)}</span>
      <div class="record-copy"><strong>${esc(title)}</strong>${description ? `<span>${description}</span>` : ''}${workout ? bestBadge(currentBests()[r.id], ex.unit) : ''}${r.memo ? `<p class="record-memo">${esc(r.memo)}</p>` : ''}</div>
      ${compact ? `<span class="record-done">${icon('check')}</span>` : `<div class="record-actions">${r.kind !== 'rest' ? button('edit-record', icon('edit'), { id: r.id, class: 'icon-button', label: `${title}の記録を編集` }) : ''}${button('delete-record', icon('trash'), { id: r.id, class: 'icon-button', label: 'この記録を削除' })}</div>`}</div>`;
  }).join('')}</div>`;
}
function allRecords() {
  return [...state.weights.map(r => ({ ...r, kind: 'weight', name: `体重 ${r.kg.toFixed(1)}kg` })), ...state.workouts.map(r => ({ ...r, kind: 'workout' })), ...state.meals.map(r => ({ ...r, kind: 'food' })), ...state.restDays.map(date => ({ id: `rest:${date}`, date, createdAt: date, kind: 'rest' }))].sort(newestHistoryFirst);
}
function latestKg() {
  return latestWeight(state, today())?.kg;
}
function currentCalorieTarget() {
  return effectiveTarget(state.settings.profile, latestKg()).target;
}
function home() {
  const date = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: 'long', day: 'numeric', weekday: 'short' }).format(new Date());
  const day = today();
  const first = !state.weights.length && !state.workouts.length && !state.meals.length && !state.restDays.length;
  const overlay = heroOverlay(weightTrend(state.weights, day), continuedDays(state, day));
  const { story, journey } = currentJourney();
  return `<header class="studio-heading"><h1>今日</h1><time datetime="${day}">${date}</time></header>
    <div class="hero-home diet-home${first ? ' first-record' : ''}">${characterCard(overlay)}
      ${recordButtons(todayChecks(state, day))}
      <div class="home-record-result">${feedbackPanel()}${stageArrival()}</div>
      ${calorieCard(summary.nutrition, currentCalorieTarget(), summary.todayMeals.length)}
      <div class="diet-journey-strip">${storyPeek(story)}${journeyPeek(journey)}</div>
      ${installAdvice()}${homeToday()}</div>`;
}
function homeToday() {
  const records = allRecords().filter(r => r.date === today());
  return `<details class="today-section home-today" ${homeTodayExpanded ? 'open' : ''}><summary>今日の記録 <span>${records.length}件</span></summary><div class="home-today-actions">${button('rest-day', state.restDays.includes(today()) ? '休養日を取り消す' : '今日は休養日にする', { class: 'text-button', icon: 'moon' })}${button('history', 'すべての記録を見る', { class: 'text-button' })}</div>${recordsList(records, true)}</details>`;
}
function workoutPage() {
  const options = PARTS.map(part => `<option value="${part.id}" ${part.id === exercisePart ? 'selected' : ''}>${part.name}</option>`).join('');
  const todaySets = new Map();
  for (const row of summary.todayWorkouts) todaySets.set(row.exerciseId, (todaySets.get(row.exerciseId) || 0) + row.sets);
  const catalog = exercisesFor(state);
  const card = ex => {
    const sets = todaySets.get(ex.id) || 0;
    const favorite = state.settings.favorites.includes(ex.id) ? `<span class="exercise-favorite" role="img" aria-label="お気に入り">${icon('star')}</span>` : '';
    const todayTotal = sets ? `<small class="exercise-today">今日 ${sets}セット</small>` : '';
    return `<article class="exercise-choice" data-exercise-id="${ex.id}"><h2><button type="button" class="exercise-toggle" data-action="select-exercise" data-id="${ex.id}" aria-expanded="false" aria-controls="exercise-editor-${ex.id}"><strong>${esc(ex.name)}</strong>${ex.custom ? '<small class="exercise-origin">自作</small>' : ''}${favorite}${todayTotal}<span class="exercise-primary">${ex.primary.map(partName).join('・')}</span>${icon('chevron')}</button></h2><div class="exercise-editor" id="exercise-editor-${ex.id}" hidden></div></article>`;
  };
  const recent = recentExerciseIds(state);
  const shortcuts = recent.map(id => button('recent-exercise', esc(exById(id).name), { id, class: 'button button-light' }));
  const groups = EXERCISE_GROUPS.map(group => {
    const items = catalog.filter(ex => exerciseGroup(ex) === group.id);
    return `<details class="exercise-group" data-group="${group.id}"><summary data-action="toggle-exercise-group" data-id="${group.id}"><span class="group-icon">${icon(group.icon)}</span><span class="group-title"><strong>${group.name}</strong><small>${group.hint}</small></span><span class="group-count">${items.length}種目</span>${icon('chevron')}</summary><div class="exercise-group-items">${items.map(card).join('')}</div></details>`;
  });
  return `<div class="workout-log"><header class="workout-log-heading"><h1>筋トレを記録</h1><div class="workout-heading-tools">${button('history','記録を見る',{class:'button button-light workout-history',icon:'history'})}${button('timer','休憩タイマー',{class:'button button-light',icon:'timer'})}</div></header>
    ${workoutDraftEntries()}<section class="workout-search" aria-label="種目を探す"><form id="exercise-search-form" class="exercise-search-controls" role="search"><label class="search-field">${icon('search')}<input id="exercise-search" type="search" enterkeyhint="search" placeholder="種目を検索" aria-label="種目・部位・器具を検索" value="${esc(exerciseQuery)}"></label><select id="exercise-part" aria-label="部位で絞り込む"><option value="">全部位</option>${options}</select></form>
    <div class="catalog-tools"><label class="custom-scope"><input id="exercise-custom-only" type="checkbox" ${customOnly ? 'checked' : ''}>自作のみ</label>${button('new-exercise','種目を作成',{class:'button button-light',icon:'plus'})}</div>
    <p id="exercise-count" class="finder-count" role="status"></p>${button('clear-exercise-search','検索条件をクリア',{class:'text-button clear-exercise-search'})}</section>
    ${recent.length ? `<section class="recent-exercises"><h2>最近やった種目</h2><div>${shortcuts.join('')}</div></section>` : ''}
    <div class="exercise-picker">${groups.join('')}</div>
    <details class="workout-xp-help"><summary>経験値のつき方</summary><p>セット数に応じて部位ごとの経験値が増えます。1部位につき1日60XPまで（食事ボーナス前）。上限に達した後も記録できます。</p></details></div>`;
}
function foodPage() {
  const foodsById = new Map(state.foods.map(f => [f.id, f]));
  const sets = state.mealSets.map(set => {
    const items = set.foodIds.map((id, index) => {
      const food = foodsById.get(id);
      return `${esc(food.name)} ${esc(portionLabel(food.amount, set.portions?.[index]))}`;
    });
    const actions = `<p>${items.join('・')}</p><div class="food-buttons">${button('log-set', mealSlotLabel(selectedMealSlot) + 'にまとめて記録', { id: set.id, class: 'button button-primary', label: set.name + 'を' + mealSlotLabel(selectedMealSlot) + 'にまとめて記録' })}${button('portion-set', '今回の量を変更', { id: set.id, class: 'button button-light' })}</div>`;
    const edit = button('edit-set', icon('edit'), { id: set.id, class: 'icon-button', label: set.name + 'を編集' });
    if (set.id === BREAKFAST.id && set.name === BREAKFAST.name && selectedMealSlot !== 'breakfast') {
      return `<details class="routine-meal"><summary>${esc(set.name)}</summary>${actions}${edit}</details>`;
    }
    return `<article class="routine-meal"><div class="routine-heading"><h3>${esc(set.name)}</h3>${edit}</div>${actions}</article>`;
  }).join('');
  const diary = [...Object.keys(MEAL_SLOTS), undefined].map(slot => {
    const meals = summary.todayMeals.filter(r => r.mealSlot === slot);
    if (!meals.length) return '';
    const rows = meals.sort(newestHistoryFirst).map(r => ({ ...r, kind: 'food' }));
    return `<section class="meal-log-group" id="meal-log-${slot || 'unassigned'}" tabindex="-1"><h3>${mealSlotLabel(slot)} <small>${meals.length}品</small></h3>${recordsList(rows, false, true)}</section>`;
  }).join('');
  const previous = previousMeal(state.meals, lastDate, selectedMealSlot);
  const finder = `<label class="food-search">${icon('search')}<input type="search" id="food-search" aria-label="料理名・食品名で検索" aria-controls="food-results" placeholder="料理・食品を検索（例：豚汁）" value="${esc(foodQuery)}"></label>
    <div class="food-catalog-bar"><button type="button" class="text-button" data-action="food-browse" aria-expanded="${foodBrowseOpen}" aria-controls="food-results">食品一覧（${state.foods.length}品）</button>${foodFilters(state.foods, foodCategory)}</div>
    <div id="food-results" aria-label="料理・食品の候補" role="region"${foodBrowseOpen ? '' : ' hidden'}>${foodResults(state.foods, state.meals, foodQuery, expandedFoods, button, foodCategory)}</div>
    <div class="food-entry-tools">${button('new-food', '包装の表示から登録', { class: 'text-button', icon: 'plus' })}<span id="ingredient-link">${ingredientLink()}</span>${button('quick-meal-entry', '食品名だけで記録', { class: 'text-button' })}</div>`;
  const canReuse = state.meals.some(meal => meal.date !== lastDate || meal.mealSlot !== selectedMealSlot);
  return `${pageHeading('食事', '食べたものと量から、栄養を自動で集計します。')}
    ${mealEntryCard({ meals: summary.todayMeals, selected: selectedMealSlot, finder, previous, previousDateLabel: previous && labelDate(previous.date), canReuse, button })}
    <section class="food-summary"><div class="food-summary-heading"><h2>今日の記録分</h2>${summary.todayMeals.length ? button('today-meals', `${summary.todayMeals.length}件の内訳 ↓`, { class: 'text-button' }) : '<small>未記録</small>'}</div>${dailyNutrition(summary.nutrition, summary.todayMeals.length, currentCalorieTarget())}</section>
    <section class="food-section food-start"><div class="section-heading"><h2>いつもの食事</h2></div>
      ${sets || '<p class="gentle-empty">よく食べる組み合わせをセットにすると、1タップで記録できます。</p>'}
      ${button('new-set', 'セットを作る', { class: 'text-button', icon: 'plus' })}</section>
    ${diary ? `<section class="food-section" id="today-meals" tabindex="-1">${sectionTitle('', '今日の食事')}${diary}</section>` : ''}
    <p class="page-note">栄養値は目安です。市販品は商品表示に合わせて編集できます。一般食品の出典は文部科学省「日本食品標準成分表（八訂）増補2023年」です。料理の値は成分表からの推定です。『外食』は一般的な外食の盛り、『家庭の量』は家庭料理の量の目安です。市販品は包装の表示を登録すると正確です。</p>`;
}
function openMealReuse() {
  const date = today(), slot = selectedMealSlot;
  const groups = reusableMeals(state.meals, date, slot);
  if (!groups.length) return;
  openModal('履歴から使う', `今日の${mealSlotLabel(slot)}に入れる食品と量を選んでください。`, `<form id="meal-reuse-form">
    <label class="field meal-choice">コピー元の食事<select name="source"></select></label>
    <div data-reuse-rows></div><h3 class="portion-total-label">今回の記録分</h3><div data-reuse-preview aria-live="polite"></div>
    ${formActions(mealSlotLabel(slot) + 'に記録')}</form>`);
  mountMealReuse($('#meal-reuse-form'), groups, slot, items => {
    if (date !== today()) { refreshDate(); return; }
    const records = items.map(({ food, portions }) => makeMeal(food, date, portions, slot));
    saveMeals(clone(state), records, records.length + '品', true);
  }, summary.todayMeals.filter(meal => meal.mealSlot === slot));
}
function toggleFoodResults(open) {
  foodBrowseOpen = open;
  $('[data-action="food-browse"]').setAttribute('aria-expanded', String(open));
  $('#food-results').hidden = !open;
}
function updateFoodResults() {
  $('#ingredient-link').innerHTML = ingredientLink();
  $('#food-results').innerHTML = foodResults(state.foods, state.meals, foodQuery, expandedFoods, button, foodCategory);
}
let foodSearchFullHeight = 0, foodScrollFrame = 0;
function showFoodCandidateAboveKeyboard() {
  if (foodScrollFrame || document.activeElement?.id !== 'food-search' || !foodQuery.trim()) return;
  const viewport = window.visualViewport;
  if (!viewport || viewport.scale > 1.05 || foodSearchFullHeight - viewport.height < 100) return;
  foodScrollFrame = requestAnimationFrame(() => {
    foodScrollFrame = 0;
    const input = document.activeElement;
    if (input?.id !== 'food-search' || !input.value.trim() || !foodBrowseOpen || foodSearchFullHeight - viewport.height < 100) return;
    const first = $('#food-results [data-action="quick-food"], #food-results .custom-food-add');
    if (!first) return;
    const top = viewport.offsetTop;
    const nav = $('.sidebar').getBoundingClientRect();
    const bottom = Math.min(top + viewport.height, nav.top > top ? nav.top : Infinity);
    const hidden = first.getBoundingClientRect().bottom - (bottom - 12);
    const room = input.getBoundingClientRect().top - (top + 8);
    const distance = Math.min(hidden, room);
    if (distance > 1) window.scrollBy({ top: distance, behavior: 'instant' });
  });
}
window.visualViewport?.addEventListener('resize', showFoodCandidateAboveKeyboard);

function ingredientLink() {
  const count = findIngredients(foodQuery, state.foods).length;
  if (!count) return '';
  const label = `食材をグラムで記録（${count.toLocaleString('ja-JP')}件）`;
  return button('ingredient-picker', foodQuery.trim() ? label : '食材をグラムで記録', { class: 'text-button', icon: 'search', label });
}
function openIngredientPicker() {
  openModal('食材をグラムで記録', '生・ゆで・焼きなどの状態と、食べた部分の重さを選びます。', `
    <details class="food-details"><summary>記録日</summary>${dateFields(today())}</details>
    ${mealSlotField(selectedMealSlot)}<label class="checkbox-field"><input type="checkbox" id="keep-ingredient">この重さを定番にも保存</label>
    <div id="weighed-ingredient"></div><p class="form-error" role="alert"></p>`);
  mountIngredientPicker($('#weighed-ingredient'), { query: foodQuery, label: 'この量で記録', foods: state.foods,
    onCreate: name => foodForm(null, null, { name, amount: '100g' }),
    onPick(food) {
      const date = $('#modal [name=date]').value;
      if (!withinInputWindow(date)) { $('#modal .form-error').textContent = '記録日は今日から7日前までを選んでください。'; return false; }
      const next = clone(state);
      if ($('#keep-ingredient').checked && !next.foods.some(f => f.id === food.id)) next.foods.unshift(food);
      return saveMeals(next, [makeMeal(food, date, 1, $('#modal [name=mealSlot]').value)], food.name, true);
    },
  });
}
let openJourneySections = [];
let chartRange = 30, calendarMonth = null, journeyDestination = null;
function render() {
  arrivalPlayer.cancel();
  displayedVoice = null;
  summary = derive(state);
  document.documentElement.classList.toggle('reduce-motion', state.settings.reducedMotion);
  const active = document.activeElement;
  const weightSelection = active?.matches('.quick-set-form [name=weight]') ? [active.selectionStart, active.selectionEnd] : null;
  if ($('.view-journey')) openJourneySections = [...document.querySelectorAll('[data-journey-section][open]')].map(el => el.dataset.journeySection);
  const focusedShelf = active?.matches('[data-journey-section] > summary') && active.parentNode.dataset.journeySection;
  const restoreFocus = active?.closest('#app') && active.dataset.action ? { action: active.dataset.action, id: active.dataset.id } : null;
  $('#app').innerHTML = `${header()}<main id="main" class="view-${tab}" tabindex="-1">${storageError ? `<div class="error-banner" role="alert">${esc(storageError)}</div>` : ''}${tab === 'home' ? home() : tab === 'workout' ? workoutPage() : tab === 'journey' ? journeyPage(state, summary, currentJourney().journey, currentJourney().week, comparisonBack, memoryLimit, currentDigest(), recentExerciseDays(), { partGrid: partGrid(), before: recordComparison, compareBefore, date: currentJourney().date, range: chartRange, month: calendarMonth || today().slice(0, 7) }) : foodPage()}<footer class="page-footer"><span class="footer-brand">そだて筋</span><span>記録はこのブラウザに保存されます。</span></footer></main>`;
  if (tab === 'journey') {
    for (const shelf of document.querySelectorAll('[data-journey-section]')) {
      shelf.open = openJourneySections.includes(shelf.dataset.journeySection);
      if (shelf.dataset.journeySection === focusedShelf) shelf.querySelector('summary').focus({ preventScroll: true });
    }
  }
  if (recordReaction) for (const character of document.querySelectorAll('#app .is-cheering')) character.style.setProperty('--cheer-delay', `${-Math.max(0, performance.now() - recordReaction.startedAt)}ms`);
  paintCharacters($('#app'));
  observeLivingCharacters();
  rememberCompanionExperience();
  if (tab === 'workout') filterExercises();
  if ($('#modal').open) {
    if ($('#workout-form')) updateWorkoutPreview();
    if ($('#workout-sets-form')) updateSetGrowthPreview();
  }
  if (active?.matches('.quick-set-form input')) {
    const form = document.querySelector(`.quick-set-form[data-exercise="${active.form.dataset.exercise}"]`);
    const input = form?.elements.namedItem(active.name);
    input?.focus({ preventScroll:true });
    if (input && weightSelection) input.setSelectionRange(...weightSelection);
  }
  if (active?.matches('.quick-set-form [type=submit]')) document.querySelector(`.quick-set-form[data-exercise="${active.form.dataset.exercise}"] [type=submit]`)?.focus({ preventScroll:true });
  if (restoreFocus) [...document.querySelectorAll('[data-action]')].find(el => el.dataset.action === restoreFocus.action && el.dataset.id === restoreFocus.id)?.focus({ preventScroll: true });
}
let toastOrigin = null;
function toast(message, undo = false, undoLabel = '取り消す') {
  toastOrigin = tab;
  $('#toast').hidden = false;
  clearTimeout(toastTimer);
  $('#toast').innerHTML = `${icon('check')}<span>${esc(message)}</span>${undo ? button('undo', esc(undoLabel), { class: 'toast-undo' }) : ''}${button('dismiss-toast', icon('close'), { class: 'toast-close', label: '通知を閉じる' })}`;
  $('#toast').classList.add('visible');
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), undo ? 15000 : 6500);
}

function rememberCompanionExperience() {
  const insight = displayedVoice?.insight;
  if (recordReaction || pendingSceneArrival || arrivalPlayer.isPlaying() || !displayedVoice || storageError || document.visibilityState !== 'visible' || ($('#modal').open && !$('#modal .home-voice-full'))) return;
  const speech = $('#modal[open] .home-voice-full') || $('.partner-speech');
  if (!speech || speech.matches('.partner-speech-expand') || getComputedStyle(speech).visibility !== 'visible') return;
  const bounds = speech.getBoundingClientRect();
  const bottom = window.innerWidth <= 760 ? $('.sidebar')?.getBoundingClientRect().top ?? innerHeight : innerHeight;
  // 同じホームでも、スクロールの外にある返事はまだ「聞いた」ことにしない。
  if (!bounds || bounds.bottom <= 0 || bounds.top >= bottom || bounds.right <= 0 || bounds.left >= innerWidth) return;
  const collection = rememberVoice(state.collection, displayedVoice, today());
  const newInsight = insight && state.settings.insightHistory[insight.family] !== insight.date;
  if (!newInsight && JSON.stringify(collection) === JSON.stringify(state.collection)) return;
  try {
    if (localStorage.getItem(STORAGE_KEY) !== sourceRaw) return;
    const next = clone(state);
    next.collection = collection;
    if (newInsight) next.settings.insightHistory[insight.family] = insight.date;
    const valid = validateState(next), raw = JSON.stringify(valid);
    localStorage.setItem(STORAGE_KEY, raw); sourceRaw = raw; state = valid;
  } catch { /* 表示の補助情報で記録を止めない。 */ }
}
function saveSafety(patch) {
  if (storageError) return false;
  try {
    if (localStorage.getItem(STORAGE_KEY) !== sourceRaw) return false;
    const next = clone(state); Object.assign(next.settings.dataSafety, patch);
    const valid = validateState(next), raw = JSON.stringify(valid);
    localStorage.setItem(STORAGE_KEY, raw); sourceRaw = raw; state = valid;
    return true;
  } catch { return false; }
}
function installAdvice() {
  if (!shouldSuggestInstall(state, currentJourney().story.days)) return '';
  return `<aside class="install-advice" aria-label="記録を守る案内"><div><strong>相棒をホーム画面にも。</strong><p>3日分の記録が積み重なりました。ホーム画面に追加すると開きやすくなります。記録はJSONにも残しておけます。</p></div><div class="settings-buttons">${button('install-app', '追加方法を見る', { class: 'button button-light' })}${button('dismiss-install', 'この案内を閉じる', { class: 'text-button' })}</div></aside>`;
}
async function showInstallHelp() {
  try {
    if (await installApp() !== 'manual') return;
    if (isIOSSafari()) { saveSafety({ installDismissed: true }); render(); }
    openModal('ホーム画面に追加', 'いつもの場所から、相棒に会えるように。', `<p>Safariでは「共有」メニューから「ホーム画面に追加」を選び、「追加」を押してください。ほかのブラウザではメニューの「アプリをインストール」などを確認してください。</p><p>追加前に、記録をJSONで書き出しておくと安心です。追加したアプリに記録が表示されない場合は、設定の「JSONから復元」で引き継げます。</p><p class="field-help">ホーム画面への追加や保存領域の永続化は、バックアップの代わりにはなりません。</p>${button('export', 'バックアップを書き出す', { class: 'button button-primary', icon: 'download' })}`);
  } catch { toast('追加できませんでした。ブラウザの共有メニューからお試しください。'); }
}
function maybeBackupReminder() {
  if (storageError || document.visibilityState !== 'visible' || $('#modal').open || $('#toast').classList.contains('visible') || !shouldRemindBackup(state)) return;
  if (!saveSafety({ backupReminderShown: true })) return;
  toast('積み重ねた記録を、JSONにも残しませんか。14日以上バックアップを書き出していません。');
  clearTimeout(toastTimer);
  $('#toast').insertAdjacentHTML('beforeend', button('export', '書き出す', { class: 'toast-undo' }));
}
function backupMessage(message, error = true) {
  const modal = $('#modal');
  if (!modal.open) { toast(message); return; }
  let notice = modal.querySelector('#backup-message');
  if (!notice) {
    notice = document.createElement('p'); notice.id = 'backup-message';
    (modal.querySelector('#import-file')?.closest('.settings-section') || modal.querySelector('.modal-content')).append(notice);
  }
  notice.className = error ? 'form-error' : 'field-help';
  notice.setAttribute('role', error ? 'alert' : 'status');
  notice.textContent = message;
  if (error) { notice.tabIndex = -1; notice.focus(); }
  else notice.removeAttribute('tabindex');
}
function exportBackup() {
  if (storageError) { backupMessage('元データの保存ボタンから、読み込めなかったデータを書き出してください。'); return; }
  try {
    if (localStorage.getItem(STORAGE_KEY) !== sourceRaw) { backupMessage('別の画面で更新されています。最新の記録を読み込んでから書き出してください。'); return; }
    const patch = { lastBackupAt: new Date().toISOString(), backupReminderShown: false };
    const exported = clone(state); Object.assign(exported.settings.dataSafety, patch);
    download(serializeBackup(exported), `sodatekin-${today()}.json`);
    const saved = saveSafety(patch);
    if ($('#modal').open && $('#modal-title')?.textContent === '設定とバックアップ') settingsModal();
    backupMessage(saved ? '書き出しを開始しました。ファイルが保存されたことを確認してください。' : '書き出しを開始しましたが、最終日時を保存できませんでした。保存したファイルをご確認ください。', !saved);
  } catch { backupMessage('書き出しを開始できませんでした。もう一度お試しください。'); }
}

function sound() {
  if (!state.settings.sound) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination); osc.frequency.setValueAtTime(660, ctx.currentTime); osc.frequency.setValueAtTime(880, ctx.currentTime + .08);
    gain.gain.setValueAtTime(.035, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .23); osc.start(); osc.stop(ctx.currentTime + .24); osc.onended = () => ctx.close();
  } catch { /* 音声非対応のブラウザでも記録を続行 */ }
}
const editingDrafts = new WeakMap();
function activeEntryForm() {
  return $('#modal').open ? $('#modal form:is(#weight-form,#workout-sets-form,#workout-form,#food-form,#custom-exercise-form)') : null;
}
function checkEditTarget(form) {
  const edit = editingDrafts.get(form);
  if (!edit) return true;
  const latest = state[edit.list].find(row => row.id === edit.original.id);
  const conflict = JSON.stringify(latest) !== JSON.stringify(edit.original);
  const submit = form.querySelector('[type=submit]');
  submit.disabled = conflict;
  let notice = form.querySelector('.draft-conflict');
  if (!conflict) { notice?.remove(); return true; }
  if (!notice) {
    notice = document.createElement('div'); notice.className = 'draft-conflict draft-update-notice';
    notice.setAttribute('role', 'alert'); form.prepend(notice);
  }
  notice.innerHTML = latest
    ? `別の画面でこの内容が更新されました。入力中の内容は下に残っています。${button('reload-edit', '最新の内容を開き直す', { class: 'text-button' })}`
    : '別の画面でこの内容が削除されました。入力中の内容は下で確認できます。';
  return false;
}
function noticeDraftUpdate(form, message) {
  let notice = form.querySelector('.draft-update-notice:not(.draft-conflict)');
  if (!notice) { notice = document.createElement('p'); notice.className = 'draft-update-notice'; notice.setAttribute('role', 'status'); form.prepend(notice); }
  notice.textContent = message;
}
function saveFailure(message) {
  // Native dialogs cover toasts; forms and non-form settings both need an inline error.
  const form = $('#modal').open ? $('#modal form') : null;
  if (form?.querySelector('.form-error')) formError(form, message);
  else if ($('#modal').open) {
    let notice = $('#modal .modal-save-error');
    if (!notice) {
      notice = document.createElement('p'); notice.className = 'form-error modal-save-error'; notice.setAttribute('role', 'alert');
      $('#modal .modal-content').prepend(notice);
    }
    notice.textContent = message;
    $('#modal').scrollTop = 0;
  }
  toast(message);
  return false;
}
function commit(next, message, { allowRecovery = false, celebrate = false, close = true, event = null, resetContext = false, undoable = true, originElement = null } = {}) {
  if (storageError && !allowRecovery) return saveFailure('保存データを保護中です。入力内容は残っています。設定からバックアップを復元してください。');
  try {
    const currentRaw = localStorage.getItem(STORAGE_KEY);
    if (currentRaw !== sourceRaw) {
      const draft = activeEntryForm();
      sourceRaw = currentRaw; undoState = null; feedback = null; activeParts = []; clearComparison();
      try { state = currentRaw ? validateState(JSON.parse(currentRaw)) : emptyState(); }
      catch { storageError = '別の画面の保存データを読み込めませんでした。元データを保護しています。設定からバックアップを確認してください。'; }
      render();
      if (!draft) closeModal();
      else if (!storageError && !checkEditTarget(draft)) return false;
      return saveFailure(storageError || (draft ? '別の画面の変更を反映しました。入力内容は残っています。記録が重複しないか確認して、もう一度保存してください。' : '別の画面で記録が更新されました。内容を確認してもう一度操作してください。'));
    }
    const valid = validateState(next);
    valid.collection = mergeCollections(state.collection, valid.collection);
    const persistNow = needsPersistence(valid, event);
    if (persistNow) valid.settings.dataSafety.persistRequested = true;
    const before = derive(state), after = derive(valid);
    let reaction = null, reactionOrigin = null, arrival = null;
    try {
      arrival = document.visibilityState === 'visible' ? newlyReachedScene(state, valid, event) : null;
      reaction = celebrate && document.visibilityState === 'visible' ? recordCelebration(state, valid, event, today(), { beforeSummary: before, afterSummary: after }) : null;
      if (reaction) reactionOrigin = captureCelebrationOrigin(originElement || document.activeElement);
    } catch { /* A cosmetic failure cannot block a valid record. */ }
    const preserveContext = !event && !allowRecovery && !resetContext && settingsOnlyChange(state, valid);
    const nextFeedback = event ? recordFeedback(state, valid, event, today(), { random: Math.random }) : null;
    if (nextFeedback?.rareDraw) valid.collection = mergeCollections(valid.collection, { heard: [], rareDays: [nextFeedback.rareDraw] });
    const snapshot = captureComparison(state, valid, event, before, after);
    const rewards = nextFeedback && ['weight', 'meal', 'workout'].includes(event.kind)
      ? newlyEarnedRewards(currentJourney().milestones.days, milestonesOf(valid)) : [];
    valid.collection = mergeCollections(valid.collection, { sceneArrivals: earnedSceneIds(valid) });
    const raw = JSON.stringify(valid);
    localStorage.setItem(STORAGE_KEY, raw);
    if (allowRecovery) workoutDrafts.clear();
    if (allowRecovery || resetContext) quickSetDrafts.clear();
    else if (event?.kind === 'workout') {
      const saved = valid.workouts.find(row => row.id === event.id);
      if (saved) quickSetDrafts.delete(saved.exerciseId);
    }
    undoState = undoable ? clone(state) : null; undoWasSettings = preserveContext;
    if (!preserveContext) {
      stopRecordCelebration(); clearTimeout(animationTimer);
      receiptExpanded = false;
      recordUndoState = nextFeedback || event?.kind === 'edit' ? clone(state) : null;
      feedback = nextFeedback; recordComparison = snapshot; compareBefore = false; earnedNow = rewards;
      activeParts = celebrate ? PARTS.filter(p => after.parts[p.id].xp > before.parts[p.id].xp).map(p => p.id) : [];
    }
    sourceRaw = raw; state = valid; storageError = '';
    if (!preserveContext) pendingSceneArrival = arrival;
    if (reaction && !preserveContext) {
      recordReaction = { ...reaction, reducedMotion: reducedMotion(), startedAt: performance.now(), scrollX: window.scrollX, scrollY: window.scrollY };
      if (state.settings.bodyType === 'studio' && !recordReaction.reducedMotion) recordReaction.studioBack = studioReactionBack(reaction.parts, back);
      try {
        const logged = tab === 'workout' && valid.workouts.find(row => row.id === event.id);
        let inlineGrowth = null;
        if (logged && selectedExercise === logged.exerciseId) {
          const ex = exById(logged.exerciseId);
          const rows = [...ex.primary, ...ex.secondary].map(id => ({
            id, name: partName(id), primary: ex.primary.includes(id), before: before.parts[id], after: after.parts[id],
            gain: reaction.parts.find(part => part.id === id)?.xp || 0,
          }));
          inlineGrowth = { exerciseId: ex.id, result: growthContent(rows, true) };
        }
        celebrationPlayer.play(reaction, { origin: reactionOrigin, parts: after.parts, bodyType: state.settings.bodyType, outfit: outfitFor(state, after.parts), back: recordReaction.studioBack ?? back, reducedMotion: recordReaction.reducedMotion, inlineGrowth });
      }
      catch { stopRecordCelebration(); }
    }
    if (persistNow) void requestPersistence();
    if (close) closeModal();
    render();
    const gained = Math.round((after.totalXP - before.totalXP) * 10) / 10;
    const leveled = PARTS.filter(p => after.parts[p.id].level > before.parts[p.id].level).map(p => p.name);
    const details = celebrate ? gained > 0 ? ` +${num(gained)}XP${leveled.length ? ` · ${leveled.join('・')}がレベルアップ！` : ''}` : ' 履歴に保存しました。' : '';
    const receipt = $('#modal').open ? null : tab === 'workout' ? $('[data-current-receipt]') : $('.record-confirmation') || $('.record-receipt');
    const receiptBounds = receipt?.getBoundingClientRect();
    const visibleBottom = window.innerWidth <= 760 ? $('.sidebar').getBoundingClientRect().top : window.innerHeight;
    const timerBounds = $('#rest-timer:not([hidden])')?.getBoundingClientRect();
    const behindTimer = receiptBounds && timerBounds &&
      receiptBounds.left < timerBounds.right && receiptBounds.right > timerBounds.left &&
      receiptBounds.top < timerBounds.bottom && receiptBounds.bottom > timerBounds.top;
    const receiptVisible = receiptBounds && receiptBounds.top >= 0 && receiptBounds.bottom <= visibleBottom && !behindTimer;
    if (!preserveContext && feedback && receiptVisible) { clearTimeout(toastTimer); $('#toast').classList.remove('visible'); }
    else { toast(message + details, undoable, preserveContext ? '設定を戻す' : '取り消す'); if (!preserveContext && feedback) $('#toast').insertAdjacentHTML('beforeend', feedback.notebookExerciseId ? button('notebook', '練習ノートを開く', { id:feedback.notebookExerciseId, class:'toast-undo' }) : button('tab', '相棒を見る', { id:'home', class:'toast-undo' })); }
    if (celebrate) sound();
    if (!recordReaction) playSceneArrival();
    if (!preserveContext && !recordReaction && activeParts.length) animationTimer = setTimeout(() => { activeParts = []; if (tab === 'home' && !arrivalPlayer.isPlaying()) render(); }, 1600);
    return true;
  } catch (error) { return saveFailure(`保存できませんでした。${error.name === 'QuotaExceededError' ? '保存容量が不足しています。入力内容は残っています。バックアップを書き出してください。' : error.message}`); }
}
function releaseMealPhoto() { disposeMealPhoto?.(); disposeMealPhoto = null; }
function openModal(title, subtitle, content, wide = false) {
  releaseMealPhoto();
  if (recordReaction) stopRecordCelebration(true);
  const hadWorkoutDraft = captureWorkoutDraft();
  const modal = $('#modal');
  if (!modal.open) {
    const origin = document.activeElement;
    modalOrigin = origin?.closest('#app') ? { element: origin, action: origin.dataset.action, id: origin.dataset.id, className: origin.className, hash: location.hash } : null;
  }
  modal.classList.toggle('wide-modal', wide);
  modal.innerHTML = `<div class="modal-header"><div><h2 id="modal-title">${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>${button('close-modal', icon('close'), { class: 'icon-button', label: '閉じる' })}</div><div class="modal-content">${content}</div>`;
  if (!modal.open) modal.showModal();
  else modal.querySelector('button, input, select, textarea')?.focus({ preventScroll: true });
  observeLivingCharacters();
  if (hadWorkoutDraft) render();
}
function closeModal() { releaseMealPhoto(); captureWorkoutDraft(); if ($('#modal').open) $('#modal').close(); pendingConfirm = null; }
function restoreModalFocus() {
  const origin = modalOrigin; modalOrigin = null;
  if (!origin || origin.hash !== location.hash) return;
  const visible = element => element?.isConnected && element.getClientRects().length && !element.disabled;
  if (visible(origin.element)) { origin.element.focus({ preventScroll: true }); return; }
  const matches = [...document.querySelectorAll('#app [data-action]')].filter(element => element.dataset.action === origin.action && element.dataset.id === origin.id && visible(element));
  const resume = ['workout-form', 'workout-previous-sets', 'quick-workout', 'workout-resume'].includes(origin.action) && [...document.querySelectorAll('#app [data-action="workout-resume"]')].find(element => element.dataset.id === origin.id && visible(element));
  const target = matches.find(element => element.className === origin.className) || matches[0] || resume || $('#main');
  target?.focus({ preventScroll: true });
}
function confirmAction(title, description, action, label = '削除する') {
  openModal(title, '', `<p class="confirm-description">${esc(description)}</p><div class="form-actions">${button('close-modal', '戻る', { class: 'button button-light' })}${button('confirm', label, { class: 'button button-primary' })}</div>`);
  pendingConfirm = action;
}
function storyModal(chapterId, keepScroll = false) {
  const scroll = $('#modal').scrollTop, action = document.activeElement?.dataset.action;
  openModal('ふたりの小さな旅', '記録を重ねて、相棒と次の景色へ。', storyContent(state, currentJourney().story, chapterId));
  $('#modal').scrollTop = keepScroll ? scroll : 0;
  if (keepScroll) (action === 'story-pin' ? $('#modal [data-action="story-pin"]') : action === 'story-reply' ? $('#modal .story-response') : $('#modal .story-read-action'))?.focus({ preventScroll: true });
  if (keepScroll && action === 'story-reply') $('#modal .story-response')?.scrollIntoView({ block: 'center', behavior: 'instant' });
}
function milestonesModal() { openModal('ふたりの記念品', '最初の一歩から、少しずつ。', milestoneContent(state, currentJourney().milestones, currentNotebook()), true); }
function wardrobeModal({ keepScroll = false, action = '', itemId = '' } = {}) {
  const scroll = $('#modal').scrollTop;
  const fixedOutfit = state.settings.bodyType === 'studio';
  openModal(fixedOutfit ? '相棒のウェア' : '相棒の着替え', fixedOutfit ? '' : '今の相棒に、好きな装いを。', wardrobeContent(state, summary.parts, { back: wardrobeBack }), true);
  $('#modal').style.setProperty('--wardrobe-header-height', `${$('#modal .modal-header').offsetHeight}px`);
  paintCharacters($('#modal'));
  $('#modal').scrollTop = keepScroll ? scroll : 0;
  if (action) $(`#modal [data-action="${action}"]${itemId ? `[data-id="${itemId}"]` : ''}`)?.focus({ preventScroll: true });
}
function weeklyDigestModal(action = '') {
  const scroll = $('#modal').scrollTop;
  const comparisonOpen = $('#modal').open && !!$('#modal .weekly-digest-comparison')?.open;
  openModal('相棒と、一週間を振り返る', '', weeklyDigestView(state, currentDigest(digestOffset), { back: digestBack, comparisonOpen }), true);
  paintCharacters($('#modal'));
  $('#modal').scrollTop = action ? scroll : 0;
  if (action) $('#modal').querySelector(action === 'weekly-digest-week' ? `[data-action="weekly-digest-week"][data-id="${digestOffset}"]` : '[data-action="weekly-digest-turn"]')?.focus({ preventScroll: true });
}
function weeklyGoalModal() {
  const goal = state.settings.weeklyGoal;
  openModal('自分のペースを決める', '月曜から日曜まで、筋トレを記録する日数の目安です。', `<form id="weekly-goal-form"><p class="goal-intro">忙しい週は変えても、外しても大丈夫。連続記録は必要ありません。</p><fieldset class="goal-options"><legend>週の目標</legend>${[null,1,2,3,4,5,6,7].map(n => `<label><input type="radio" name="weeklyGoal" value="${n ?? ''}" ${goal === n || (!goal && n === null) ? 'checked' : ''}><span>${n ? `${n}<small>日</small>` : '決めない'}</span></label>`).join('')}</fieldset><p class="field-help">目標を達成しない週も、経験値やレベルは減りません。</p>${formActions('このペースにする')}</form>`);
}
function formError(form, message) { const error = form.querySelector('.form-error'); error.textContent = message; error.focus(); }
function errorField() { return '<p class="form-error" role="alert" tabindex="-1"></p>'; }
function formActions(label = '記録して育てる') { return `${errorField()}<div class="form-actions">${button('close-modal', 'キャンセル', { class: 'button button-light' })}<button type="submit" class="button button-primary">${icon('check')}${label}</button></div>`; }
function customExerciseInUse(id) {
  return state.workouts.some(row => row.exerciseId === id) || workoutDrafts.has(id) || quickSetDrafts.has(id);
}
function customExerciseModal(row = null) {
  const locked = row && customExerciseInUse(row.id);
  const category = row?.category || (openExerciseGroups.size === 1 ? [...openExerciseGroups][0] : 'body');
  const recent = recentExerciseIds(state);
  const shortcuts = recent.map(id => button('recent-exercise', esc(exById(id).name), { id, class: 'button button-light' }));
  const groups = EXERCISE_GROUPS.map(g => `<option value="${g.id}" ${g.id === category ? 'selected' : ''}>${g.name}</option>`).join('');
  const parts = PARTS.map(p => `<option value="${p.id}" ${p.id === (row?.part || exercisePart) ? 'selected' : ''}>${p.name}</option>`).join('');
  openModal(row ? '自作種目を編集' : '種目を作成', row ? '' : 'いつもの種目に名前をつけて、次回から一覧で選べます。', `<form id="custom-exercise-form">
    <label class="field">種目名<input name="name" required maxlength="60" autocomplete="off" placeholder="例：リュック加重スクワット" value="${esc(row?.name ?? exerciseQuery.trim().slice(0,60))}"></label>
    <div class="form-row"><label class="field">種類<select name="category" ${locked ? 'disabled' : ''}>${groups}</select></label><label class="field">主に鍛える部位<select name="part" required ${locked ? 'disabled' : ''}><option value="">選んでください</option>${parts}</select></label></div>
    <label class="field">記録の単位<select name="unit" ${locked ? 'disabled' : ''}><option value="回">回数（回）</option><option value="秒" ${row?.unit === '秒' ? 'selected' : ''}>時間（秒）</option></select></label>
    ${locked ? '<p class="field-help">記録・入力中のセットがある種目は、種類・部位・単位を固定します。</p>' : ''}
    <div class="form-row"><label class="field">初回の目安<div class="input-unit"><input name="count" type="number" inputmode="numeric" required min="1" max="86400" value="${row?.count ?? 10}"><span data-count-unit>${row?.unit || '回'}</span></div></label>
    <label class="field">セット数<div class="input-unit"><input name="sets" type="number" inputmode="numeric" required min="1" max="100" value="${row?.sets ?? 3}"><span>セット</span></div></label></div>
    ${formActions(row ? '変更を保存' : '種目を作成')}${row && !locked ? button('remove-custom-exercise','この種目を削除',{id:row.id,class:'text-button'}) : ''}</form>`);
  if (row) editingDrafts.set($('#custom-exercise-form'), { list: 'customExercises', original: clone(row) });
  $('#custom-exercise-form [name=name]').focus({ preventScroll: true });
}

function weightForm(record = null) {
  const date = record?.date ?? today();
  const kg = record?.kg ?? latestWeight(state, date)?.kg ?? '';
  openModal(record ? '体重の記録を編集' : '体重を記録', '', `<form id="weight-form">
    <label class="field">体重（kg）<input type="text" name="kg" inputmode="decimal" autocomplete="off" value="${esc(kg)}"></label>
    ${dateFields(date, record?.date, '記録日')}${formActions(record ? '変更を保存' : '体重を記録する')}</form>`);
  const form = $('#weight-form');
  if (record) editingDrafts.set(form, { list: 'weights', original: record });
  form.elements.kg.focus();
  form.elements.kg.select();
}

function workoutForm(exerciseId, record = null, setValues) {
  if (!record && workoutDrafts.has(exerciseId)) { workoutSetsModal(workoutDrafts.get(exerciseId)); return; }
  const ex = exById(exerciseId), last = lastWorkout(state, exerciseId);
  const v = { ...(record || last || ex), ...setValues };
  if (setValues && last) v.sets = 1;
  const prominentWeight = ex.usesWeight || v.weight != null || last?.weight != null;
  const weightField = `<label class="field">${exerciseGroup(ex) === 'weighted' ? '追加重量' : '重量'} <span class="optional">任意</span><div class="input-unit"><input type="number" name="weight" min="0" max="2000" step="${weightStep(v.weight)}" value="${esc(v.weight ?? '')}" inputmode="decimal" placeholder="未入力"><span>kg</span></div></label>`;
  const adding = !record && summary.todayWorkouts.some(r => r.exerciseId === exerciseId);
  const description = !last ? `初回の目安は${ex.count}${ex.unit} × ${ex.sets}セットです。行った分に合わせて変更できます。`
    : setValues ? '入力中の1セットを引き継ぎました。' : adding ? '今日の分にもう1件追加します。' : `${shortDate(last.date)}の前回値です。今日できた分に合わせてください。`;
  openModal(record ? '筋トレの記録を編集' : adding ? `${ex.name}を追加` : ex.name, record ? ex.name : description, `<form id="workout-form" data-exercise="${ex.id}" ${record ? `data-record="${esc(record.id)}"` : ''}>
    <div class="form-row workout-main-fields${prominentWeight ? ' with-weight' : ''}">${prominentWeight ? weightField : ''}<label class="field">${ex.unit === '秒' ? '秒数' : '回数'}<div class="input-unit"><input type="number" name="count" min="1" max="86400" step="1" value="${v.count}" required inputmode="numeric"><span>${ex.unit}</span></div></label><label class="field sets-field">セット数<div class="input-unit"><input type="number" name="sets" min="1" max="100" step="1" value="${v.sets}" required inputmode="numeric"><span>セット</span></div></label></div>
    <p class="field-help">続けて行ったひとまとまりが1セットです。実際にできた分だけを入力してください。</p>${!record ? button('workout-by-set', '回数・重さが違うときは、セットごとに入力 →', { class: 'text-button workout-by-set-link' }) : ''}<details class="workout-extras" ${record ? 'open' : ''}><summary>${prominentWeight ? '日付・メモ' : '日付・重さ・メモ'} <span id="workout-extra-summary"></span></summary><div class="form-row">${dateFields(record?.date || today(), record?.date)}${prominentWeight ? '' : weightField}</div>
    <label class="field">メモ <span class="optional">任意</span><textarea name="memo" maxlength="500" rows="2" placeholder="今日の気づきをひとこと">${esc(record?.memo || '')}</textarea></label>
    ${record ? '<div class="xp-preview" id="xp-preview"></div>' : ''}<p class="field-help">今日から7日前まで入力できます。保存済みの記録は、元の日付のまま編集できます。</p></details>${record ? '' : '<div class="xp-preview" id="xp-preview"></div>'}${formActions(record ? '変更を保存' : adding ? 'この内容で追加' : '記録して育てる')}</form>${!record ? previousWorkoutSetsEntry(previousWorkoutSetSummary(state, exerciseId)) : ''}`);
  if (record) editingDrafts.set($('#workout-form'), { list: 'workouts', original: state.workouts.find(row => row.id === record.id) });
  updateWorkoutPreview();
}
function workoutSetsModal(draft, error = null, focus = null) {
  openModal(`${exById(draft.exerciseId).name}をセットごとに入力`, '実施日をそろえ、できた分をまとめて記録。', workoutSetsView(draft, { error, state }), true);
  $('#modal').scrollTop = 0;
  workoutDrafts.put(draft, state);
  updateSetGrowthPreview();
  if (focus || error) focusWorkoutSetField($('#workout-sets-form'), focus || error);
}
function changeWorkoutSetRows(action, index) {
  const form = $('#workout-sets-form'); if (!form) return;
  if (!exById(form.dataset.exercise)) return formError(form, '種目の設定が変更されました。種目一覧で選び直してください。');
  const draft = readWorkoutSetDraft(form);
  try {
    const next = action === 'workout-set-add' ? addWorkoutSetRow(draft, state) : removeWorkoutSetRow(draft, index);
    workoutSetsModal(next, null, { field: 'count', rowIndex: action === 'workout-set-add' ? next.rows.length - 1 : Math.min(index, next.rows.length - 1) });
  } catch (error) { workoutSetsModal(draft, error); }
}
function showWorkoutGrowth(target, ex, sets, date) {
  if (!ex) { target.textContent = '種目を選び直してください。'; return; }
  if (!Number.isInteger(sets) || sets < 1 || sets > 100) { target.textContent = 'セット数は1〜100の整数で入力してください。'; return; }
  if (!withinInputWindow(date)) { target.textContent = '実施日は今日から7日前までを選んでください。'; return; }
  const amounts = growthSummaryText(workoutGrowth(state, summary, ex, sets, date));
  target.innerHTML = `<b>${sets}セットの成長予告</b><span>${amounts}</span>`;
}
function updateSetGrowthPreview() {
  const form = $('#workout-sets-form');
  if (form) showWorkoutGrowth(form.querySelector('.sets-growth-preview'), exById(form.dataset.exercise), form.querySelectorAll('.workout-set-row').length, form.elements.date.value);
}
function updateWorkoutPreview() {
  const form = $('#workout-form'); if (!form) return;
  const ex = exById(form.dataset.exercise), sets = Number(form.elements.sets.value);
  if (!ex) { $('#xp-preview').textContent = '種目の設定が変更されました。種目一覧で選び直してください。'; return; }
  if (!form.dataset.record) {
    const field = form.elements.sets;
    form.querySelector('[type=submit]').textContent = field.validity.valid ? `${field.valueAsNumber}セットを記録` : '記録する';
  }
  $('#workout-extra-summary').textContent = `${form.elements.date.value ? labelDate(form.elements.date.value) : '日付未入力'}${form.elements.weight.closest('details') ? ` · ${form.elements.weight.value !== '' ? `${form.elements.weight.value}kg` : '重さなし'}` : ''}${form.elements.memo.value.trim() ? ' · メモあり' : ''}`;
  if (!form.dataset.record) { showWorkoutGrowth($('#xp-preview'), ex, sets, form.elements.date.value); return; }
  if (!form.elements.sets.validity.valid) { $('#xp-preview').textContent = 'セット数を確認してください。'; return; }
  $('#xp-preview').innerHTML = `<b>この記録の基本XP</b><span>${ex.primary.map(p => `${partName(p)} +${sets * RULES.primaryXP}`).concat(ex.secondary.map(p => `${partName(p)} +${sets * RULES.secondaryXP}`)).join('　')}</span><small>1日上限・食事ボーナスを反映して保存時に再計算します。</small>`;
}
function recentMealChoices() {
  const seen = new Set(), buttons = [];
  for (const meal of [...state.meals].sort(newestHistoryFirst)) {
    const name = meal.name.normalize('NFKC').trim();
    if (seen.has(name)) continue;
    seen.add(name);
    buttons.push(button('reuse-meal', esc(meal.name), { id:meal.id, class:'recent-meal-choice' }));
    if (buttons.length === 3) break;
  }
  return buttons.length ? `<fieldset class="recent-meals"><legend>前回の内容を使う</legend>${buttons.join('')}</fieldset>` : '';
}
function openMealPhoto() {
  openModal('写真から記録', '日本の料理は認識できないものが多い試験版です。候補は必ず確かめてください。', '<div id="meal-photo-draft"></div>');
  disposeMealPhoto = mountMealPhoto($('#meal-photo-draft'), {
    foods: state.foods, dateFields: dateFields(today()), mealSlotField: mealSlotField(selectedMealSlot), formActions,
    onSave(items, date, form) {
      if (!withinInputWindow(date)) return formError(form, '記録日は今日から7日前までを選んでください。');
      const next = clone(state);
      const ids = new Set(next.foods.map(f => f.id));
      const records = items.map(({ food, portions }) => {
        if (food.id && !ids.has(food.id)) {
          next.foods.push({ ...food });
          ids.add(food.id);
        }
        return makeMeal(food.id ? food : { ...food, id: id() }, date, portions, form.elements.mealSlot.value);
      });
      saveMeals(next, records, '写真で確認した食事', true);
    },
  });
}
function quickMealForm(meal = {}) {
  openModal('食事を記録', '食品名だけで記録できます。', `<form id="food-form">
    <label class="field">食品名<input name="name" maxlength="60" value="${esc(meal.name || foodQuery)}" required autofocus></label>
    ${recentMealChoices()}<details class="food-details"><summary>量・栄養・記録日（任意）</summary>
    <label class="field">基準量<input name="amount" maxlength="60" value="${esc(meal.amount || '')}"></label>
    ${nutritionFields(meal)}${portionField({ name: '食べた量', amount: meal.amount || '1食分' }, 0, meal.portions ?? 1)}
    ${mealSlotField(selectedMealSlot)}${dateFields(today())}<label class="checkbox-field"><input type="checkbox" name="saveFood">定番の食品にも保存する</label>
    </details>${formActions('食事を記録')}</form>`);
}
function foodForm(food = null, record = null, draft = { name: foodQuery, amount: '1個' }) {
  const isNew = !food && !record;
  const v = record || food || { name: draft.name.trim().slice(0, 60), amount: draft.amount };
  const nutrients = `<p class="field-help">基準量あたりの値を、分かる項目だけ入力してください。</p>${nutritionFields(v)}`;
  const baseFields = `<label class="field">料理・食品名<input name="name" maxlength="60" placeholder="例：わが家の豆カレー" value="${esc(v.name)}" required></label>
    <label class="field">基準量<input name="amount" maxlength="60" value="${esc(v.amount)}" placeholder="例：1皿、100g"></label>
    ${isNew ? '<p class="field-help">100gあたりの表示なら、基準量を100gにすると重さで記録できます</p>' : ''}
    ${nutrients}`;
  const title = record ? '食事の記録を編集' : food ? '定番の食品を編集' : '包装の表示から登録';
  openModal(title, food ? '今後この食品を選ぶときに使う値です。' : '', `<form id="food-form" ${isNew ? 'data-package-entry' : ''} ${food ? `data-food="${esc(food.id)}"` : ''} ${record ? `data-record="${esc(record.id)}"` : ''}>
    ${record ? `<h3>${esc(record.name)}</h3>${portionField({ ...v, name: '食べた量' }, 0, record.portions)}<details class="food-details"><summary>食品名・基準量・栄養値</summary>${baseFields}</details>` : baseFields}
    ${isNew ? portionField({ ...v, name: '食べた量' }) : ''}
    ${!food ? `${mealSlotField(record ? record.mealSlot : selectedMealSlot, !!record)}<div id="food-form-preview" aria-live="polite"></div><details class="food-details" ${record && record.date !== today() ? 'open' : ''}><summary>記録日</summary>${dateFields(record?.date || today(), record?.date)}</details>` : ''}
    ${isNew ? `${errorField()}<div class="form-actions"><button type="submit" class="button button-primary">登録して記録</button><button type="submit" class="button button-light" name="registerOnly" formnovalidate>一覧に追加だけ</button></div>` : formActions('変更を保存')}</form>`);
  if (food || record) editingDrafts.set($('#food-form'), { list: record ? 'meals' : 'foods', original: record || food });
  updateFoodFormPreview();
}
function updateFoodFormPreview() {
  if (!$('#food-form-preview')) return;
  const form = $('#food-form'), food = foodFormValues(new FormData(form)), select = form.elements.portions;
  for (const option of select.options) option.textContent = portionLabel(food.amount || '1食分', Number(option.value));
  const existing = form.hasAttribute('data-package-entry') && matchingFood(state.foods, food);
  const note = existing ? '<p class="field-help">同名・同じ基準量の定番があるので、登録済みの栄養値で記録します。</p>' : '';
  $('#food-form-preview').innerHTML = note + portionPreview([existing || food], [select]);
}
function portionForm(key, mode) {
  const set = mode === 'set' ? state.mealSets.find(s => s.id === key) : null;
  const foods = set ? set.foodIds.map(id => state.foods.find(f => f.id === id)) : [state.foods.find(f => f.id === key)];
  if (foods.some(f => !f)) return;
  openModal(set?.name || foods[0].name, '今回食べた量を選んでください。', `<form id="portion-form" data-id="${esc(key)}" data-mode="${mode}">
    ${mealSlotField(selectedMealSlot)}
    ${foods.map((food, i) => portionField(food, i, set?.portions?.[i] ?? 1, !!set)).join('')}
    <h3 class="portion-total-label">今回の記録分</h3><div id="portion-preview" aria-live="polite"></div>
    <details class="food-details"><summary>記録日</summary>${dateFields(today())}</details>${formActions('この量で記録')}</form>
    ${set ? '' : button('food-edit', '定番の内容を編集', { id: key, class: 'text-button' })}`);
  const form = $('#portion-form');
  const refresh = () => {
    const selects = [...form.querySelectorAll('[name=portions]')];
    $('#portion-preview').innerHTML = portionPreview(foods, selects);
    form.querySelector('[type="submit"]').disabled = selects.every(select => select.value === '0');
  };
  form.addEventListener('change', refresh);
  refresh();
}
function filterExercises(openSingle = false) {
  const matches = findExercises(exerciseQuery, exercisePart, state).filter(ex => !customOnly || ex.custom);
  const counts = new Map();
  for (const ex of matches) {
    const group = exerciseGroup(ex);
    counts.set(group, (counts.get(group) || 0) + 1);
  }
  if (openSingle) {
    openExerciseGroups.clear();
    if (exerciseQuery.trim() || exercisePart || customOnly) for (const group of counts.keys()) openExerciseGroups.add(group);
  }
  for (const section of document.querySelectorAll('.exercise-group')) {
    const group = section.dataset.group, count = counts.get(group) || 0;
    section.hidden = !count;
    section.open = openExerciseGroups.has(group);
    section.querySelector('.group-count').textContent = `${count}種目`;
  }
  const ids = new Set(matches.map(ex => ex.id));
  const recent = $('.recent-exercises');
  if (recent) {
    for (const button of recent.querySelectorAll('button')) button.hidden = !ids.has(button.dataset.id);
    recent.hidden = !recent.querySelector('button:not([hidden])');
  }
  if (!ids.has(selectedExercise)) selectedExercise = '';
  if (openSingle && matches.length === 1) selectedExercise = matches[0].id;
  for (const card of document.querySelectorAll('.exercise-choice')) {
    const id = card.dataset.exerciseId, open = id === selectedExercise;
    card.hidden = !ids.has(id);
    const panel = card.querySelector('.exercise-editor');
    card.querySelector('.exercise-toggle').setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
    if (open && !panel.firstElementChild) {
      const ex = exById(id);
      panel.innerHTML = quickSetCard(ex, true) + (ex.custom ? button('edit-custom-exercise', '自作種目を編集', {id, class:'text-button custom-edit'}) : '');
      const form = panel.querySelector('.quick-set-form');
      if (form) validateQuickSet(form);
      void paintCharacters(panel);
    } else if (!open && panel.firstElementChild) panel.replaceChildren();
  }
  $('#exercise-count').textContent = matches.length ? `${matches.length}種目` : customOnly && !state.customExercises.length ? '自作種目はまだありません。「種目を作成」から追加できます。' : '一致する種目がありません。';
  $('.clear-exercise-search').hidden = !(exerciseQuery || exercisePart || customOnly);
}
function historyResults() {
  const {query,kind,from,to} = calendarHistoryDay ? {query:'', kind:'', from:calendarHistoryDay, to:calendarHistoryDay} : historyFilters;
  if (from && to && from > to) return '<p class="history-empty" role="status">開始日は終了日より前にしてください。</p>';
  const records = allRecords().filter(r => (!kind || r.kind === kind) && (!from || r.date >= from) && (!to || r.date <= to) && matchesQuery(`${r.kind === 'workout' ? exById(r.exerciseId).name : r.kind === 'rest' ? '休養' : r.name} ${r.memo || ''} ${r.date}`,query));
  if (calendarHistoryDay) {
    if (!records.length) return '<p class="history-empty">この日の記録はありません。</p>';
    const more = records.length > historyLimit ? button('more-history', 'さらに30件を見る', { class:'button button-light history-more' }) : '';
    return recordsList(records.slice(0, historyLimit)) + more;
  }
  const groups = new Map();
  records.slice(0,historyLimit).forEach(r=>{ if(!groups.has(r.date)) groups.set(r.date,[]); groups.get(r.date).push(r); });
  return `<p class="history-result-count" role="status">${records.length}件${records.length > historyLimit ? `のうち${historyLimit}件を表示` : ''}</p>${records.length ? [...groups].map(([date,rows])=>`<section class="history-day"><h3><time datetime="${date}">${date.replaceAll('-',' / ')} <span>${labelDate(date)}</span></time><small>${rows.length}件</small></h3>${recordsList(rows)}</section>`).join('') : '<div class="history-empty">条件に合う記録はありません。<br>検索語や期間を変えてみてください。</div>'}${records.length>historyLimit ? button('more-history','さらに30件を見る',{class:'button button-light history-more'}) : ''}`;
}
function updateHistory() {
  const el = $('#history-results'); if (!el) return;
  el.innerHTML = historyResults();
}
function historyModal(day = null) {
  calendarHistoryDay = day;
  if (day) {
    const dateLabel = new Intl.DateTimeFormat('ja-JP', {dateStyle:'long', timeZone:'Asia/Tokyo'}).format(new Date(day + 'T00:00:00Z'));
    openModal(dateLabel + 'の記録', '', '<div id="history-results" class="day-history" tabindex="-1"></div>', true);
    updateHistory();
    return;
  }
  openModal('これまでの足あと', '編集や削除をすると、経験値と思い出も計算し直します。', `<div class="history-summary"><span>体重 <b>${state.weights.length}</b> 件</span><span>筋トレ <b>${state.workouts.length}</b> 件</span><span>食事 <b>${state.meals.length}</b> 件</span><span>続いた日 <b>${currentJourney().journey.days}</b> 日</span></div><div class="history-filters"><label class="search-field">${icon('search')}<input type="search" id="history-search" aria-label="記録を検索" placeholder="体重・種目・食品・メモで検索" value="${esc(historyFilters.query)}"></label><div class="history-filter-row"><label>種類<select id="history-kind">${[['','すべて'],['weight','体重'],['food','食事'],['workout','筋トレ'],['rest','休養']].map(([id,name])=>`<option value="${id}" ${historyFilters.kind===id?'selected':''}>${name}</option>`).join('')}</select></label><label>開始日<input id="history-from" type="date" value="${historyFilters.from}" max="${today()}"></label><label>終了日<input id="history-to" type="date" value="${historyFilters.to}" max="${today()}"></label></div>${button('clear-history','検索条件をリセット',{class:'text-button'})}</div><div id="history-results"></div>`, true);
  updateHistory();
}
function attachHistoryReturn(scroll) {
  const form = activeEntryForm(), edit = editingDrafts.get(form);
  if (!edit || scroll === undefined) return;
  edit.historyScroll = scroll;
  const cancel = form.querySelector('.form-actions [data-action="close-modal"]');
  cancel.dataset.action = 'history-back';
  cancel.textContent = '一覧に戻る';
}
function restoreHistory(id, scroll, { message = '', undo = false, focusAction = 'edit-record' } = {}) {
  historyModal(calendarHistoryDay);
  const results = $('#history-results');
  const row = [...results.querySelectorAll(`[data-action="${focusAction}"]`)].find(el => el.dataset.id === id);
  let notice;
  if (message) {
    notice = document.createElement('div');
    notice.className = 'history-edit-notice';
    notice.innerHTML = `<span role="status">${esc(message)}${row ? '' : ' 現在の表示範囲から外れました。'}</span>${undo ? button('history-undo-edit', '訂正を取り消す', { id, class:'text-button' }) : ''}`;
    if (row) row.closest('.record-row').before(notice); else results.prepend(notice);
  }
  const modal = $('#modal');
  modal.scrollTop = row ? scroll : 0;
  (row || $('#history-search') || results).focus({ preventScroll:true });
  if (row) {
    const headerBottom = modal.querySelector('.modal-header').getBoundingClientRect().bottom;
    const dialogBottom = modal.getBoundingClientRect().bottom;
    modal.scrollTop += dayHistoryScrollOffset(row.getBoundingClientRect(), headerBottom + 4, dialogBottom - 4, notice?.getBoundingClientRect().top);
  }
}
function saveRecordEdit(form, next, record, date, message) {
  const scroll = editingDrafts.get(form)?.historyScroll;
  const saved = commit(next, message, { close: scroll === undefined, event: { kind:'edit', id:record.id, date } });
  if (saved && scroll !== undefined) restoreHistory(record.id, scroll, { message, undo:true });
}
function forecastMarkup(id) {
  const f = growthForecast(state, id, today(), summary);
  if (!f) return '';
  const heading = f.showDays ? `次の体形の節目まで、今のペースならあと約${num(f.days)}日。` : f.reliable ? '輪郭は、記録するたび少しずつ育っています。' : '輪郭は少しずつ変化中。日数の目安は、記録が集まってから。';
  return `<div class="growth-forecast"><strong>${heading}</strong><p>次の節目まで 約${num(f.remainingXP)}XP</p><small>節目の間も姿は変わります。日数は最近の記録からの目安です。</small></div>`;
}
function partModal(id, more = false, keepView = false) {
  const scroll = $('#modal').scrollTop, previousLimit = partHistoryLimit;
  const comparisonOpen = (more || keepView) && activePartDetail === id && !!$('#modal .part-progress-comparison')?.open;
  const focused = document.activeElement, focusAction = focused?.dataset.action, focusId = focused?.dataset.id;
  const comparisonFocused = focused?.matches('.part-progress-comparison>summary');
  if (!keepView) { if (!more || activePartDetail !== id) partHistoryLimit = 30; else partHistoryLimit += 30; }
  activePartDetail = id;
  const p = summary.parts[id];
  const records = allRecords().filter(r => r.kind === 'workout' && [...exById(r.exerciseId).primary, ...exById(r.exerciseId).secondary].includes(id));
  openModal(`${partName(id)}の成長`, '少しずつ積み重なった、相棒の力。', `<div class="part-detail"><span class="detail-icon">${icon(id)}</span><strong><small>Lv.</small>${p.level}</strong><div><b>${num(p.xp)} XP</b><span>これまでの合計</span></div></div>${progress(p.progress, p.nextXP, `${partName(id)}の経験値`)}<p class="detail-progress">次のレベルまで あと ${num(p.nextXP - p.progress)}XP</p><div class="detail-stats"><div><span>鍛えた日</span><b>${new Set(records.map(r => r.date)).size}日</b></div><div><span>今日の経験値</span><b>+${num(p.todayXP)}XP</b></div><div><span>体形の段階</span><b>${p.stage + 1} / 5</b></div></div>${partProgressView(state, id)}<p class="field-help">${p.lastTrained ? `最後に鍛えた日：${p.lastTrained}。` : 'この部位の記録は、これから。'}休んでもレベル・XP・体形はそのままです。体形は累計XPに応じてゆっくり育ち、${num(RULES.shapeXPMax)}XPで最大になります。レベルはその後も積み重なります。</p>${forecastMarkup(id)}${button('part-exercises', `${partName(id)}に関係する種目を見る ${icon('arrow')}`, { id, class: 'button button-light part-exercises-link' })}<h3 class="modal-section-title">この部位の記録</h3><p class="history-result-count" role="status">${records.length}件${records.length > partHistoryLimit ? `のうち${partHistoryLimit}件を表示` : ''}</p>${recordsList(records.slice(0, partHistoryLimit))}${records.length > partHistoryLimit ? button('more-part-records', 'さらに30件を見る', { class: 'button button-light history-more' }) : ''}`);
  if (comparisonOpen) $('#modal .part-progress-comparison').open = true;
  paintCharacters($('#modal'));
  $('#modal').scrollTop = more || keepView ? scroll : 0;
  if (more) [...$('#modal').querySelectorAll('[data-action="edit-record"]')].find(el => el.dataset.id === records[previousLimit]?.id)?.focus({ preventScroll: true });
  if (keepView) (comparisonFocused ? $('#modal .part-progress-comparison>summary') : [...$('#modal').querySelectorAll('[data-action]')].find(element => element.dataset.action === focusAction && element.dataset.id === focusId))?.focus({ preventScroll: true });
}
function favoritesModal() {
  const choices = exercisesFor(state).map(ex => `<label class="choice"><input type="checkbox" name="favorite" value="${ex.id}" ${state.settings.favorites.includes(ex.id) ? 'checked' : ''}><span>${esc(ex.name)}</span></label>`);
  openModal('いつもの3種目', 'お気に入りにする種目を、3つまで選んでください。', `<label class="search-field">${icon('search')}<input type="search" id="favorite-search" placeholder="種目を検索" aria-label="お気に入りにする種目を検索"></label>
    <form id="favorites-form"><p id="favorite-selection" class="finder-count" role="status"></p><div class="choice-grid">${choices.join('')}</div><p id="favorite-empty" class="field-help" hidden>一致する種目がありません。</p>${formActions('お気に入りを保存')}</form>`);
  updateFavoriteSelection();
}
function updateFavoriteSelection() {
  const selected = [...$('#favorites-form').querySelectorAll('input:checked')].map(input => exById(input.value).name);
  $('#favorite-selection').textContent = `選択中 ${selected.length}/3${selected.length ? '　' + selected.join('・') : ''}`;
}
function partnerNameModal() {
  openModal('相棒の名前', '呼びたくなる名前を、ひとつ。あとから変更できます。', `<form id="partner-name-form"><label class="field">名前<input name="partnerName" maxlength="12" value="${esc(state.settings.partnerName)}" required autocomplete="off"></label>${formActions('この名前にする')}</form>`);
}
function bodyTypeModal() {
  bodyTypeBack = false;
  openModal('相棒の体つきを選ぶ', '自分に近い姿でも、好きな姿でも。あとから変更できます。', `<form id="body-type-form">${bodyTypeOptions(state.settings.bodyType)}<div id="body-type-preview"></div>${button('body-type-back', '正面 / 後ろ姿', { class: 'button button-light body-type-turn', icon: 'turn' })}<p class="field-help">どの姿でも、育つ速さとXPは同じです。身長・体重から自動で選びません。保存すると、はじめの姿と今の姿を同じ体型の系列で表示します。</p>${formActions('この姿にする')}</form>`, true);
  updateBodyTypePreview(); paintCharacters($('#modal'));
}
function updateBodyTypePreview() {
  const form=$('#body-type-form'); if(!form)return;
  $('#body-type-preview').innerHTML=bodyTypePreview(summary.parts,form.elements.bodyType.value,bodyTypeBack,summary.workoutDays>0);
  paintCharacters($('#body-type-preview'));
}
function profileModal() {
  const profile = state.settings.profile;
  const hasValues = Object.values(profile).some(value => value !== null);
  openModal('あなたのプロフィール', 'どの項目も任意です。', `<form id="profile-form" class="profile-form">
    <div class="form-row">${PROFILE_FIELDS.map(field => profileField(field, profile)).join('')}</div>
    ${caloriePreviewPanel(profile)}
    <p class="profile-note">プロフィールはこのブラウザとJSONバックアップに保存されます。日ごとの体重は「今日」から記録できます。</p>
    ${formActions('保存する')}${hasValues ? button('clear-profile', '保存したプロフィールを消去', { class: 'text-button profile-clear' }) : ''}</form>`);
}
function caloriePreviewPanel(profile) {
  return `<div class="calorie-preview" aria-live="polite">${caloriePreview(profile, latestKg())}</div>
    <p class="profile-note">目安です。医療的な指示ではありません。</p>`;
}
function calorieSetupModal() {
  const profile = state.settings.profile;
  const fields = calorieSetupFields(profile, latestKg());
  const manual = PROFILE_FIELDS.find(field => field.key === 'calorieTarget');
  openModal('目標カロリーの目安', fields ? '自動で計算するには、次の項目を入力してください。' : '', `<form id="calorie-setup-form" class="profile-form">
    ${fields ? `<div class="form-row">${fields}</div>` : ''}
    ${caloriePreviewPanel(profile)}
    ${profileField(manual, profile)}
    ${formActions(profile.calorieTarget === null ? 'この目安を使う' : '手入力の目安を保存')}
    ${profile.calorieTarget !== null ? '<button type="submit" name="resetTarget" class="text-button">自動の目安に戻す</button>' : ''}
    </form>`);
}
function updateCaloriePreview(form) {
  const data = new FormData(form);
  if (form.id === 'calorie-setup-form') {
    form.querySelector('.form-actions [type=submit]').textContent = data.get('calorieTarget').trim() ? '手入力の目安を保存' : 'この目安を使う';
  }
  const preview = form.querySelector('.calorie-preview');
  try {
    preview.innerHTML = caloriePreview(profileDraft(state.settings.profile, data), latestKg());
  } catch (error) {
    preview.textContent = error.message;
  }
}
function saveProfile(next, message) {
  const saved = commit(next, message);
  const form = $('#profile-form, #calorie-setup-form');
  if (!saved && form && $('#modal').open) {
    // モーダルの外の通知だけでは保存失敗に気づけないため、入力欄のそばにも残す。
    formError(form, $('#toast > span')?.textContent || 'プロフィールを保存できませんでした。');
  }
}
function setForm(existing = null) {
  openModal(existing ? '食事セットを編集' : '食事セットを作る', 'よく食べる食品と、いつもの量を選んでください。', `<form id="set-form" ${existing ? `data-id="${esc(existing.id)}"` : ''}>
    <label class="field">セット名<input name="name" maxlength="60" value="${esc(existing?.name || '')}" placeholder="例：いつもの朝食" required></label>
    <label class="food-search">${icon('search')}<input type="search" id="set-search" aria-label="セットの食品を検索" placeholder="食品名で検索"></label>
    <div class="set-choices">${foodSetRows(state.foods, existing)}</div><p id="set-selection" class="field-help" role="status"></p>
    <details class="food-details"><summary>食材をグラムで追加</summary><div data-set-ingredients></div></details>
    ${formActions('セットを保存')}</form>${existing ? button('delete-set', 'このセットを削除', { id: existing.id, class: 'text-button danger' }) : ''}`);
  const form = $('#set-form'), foods = [...state.foods];
  setDraftFoods.set(form, foods);
  mountIngredientPicker(form.querySelector('[data-set-ingredients]'), { label: 'セットに追加', foods,
    onPick(food) {
      const list = form.querySelector('.set-choices');
      let index = foods.findIndex(f => f.id === food.id);
      if (index === -1) {
        index = foods.push(food) - 1;
        list.insertAdjacentHTML('beforeend', foodSetRows([food], null));
        list.lastElementChild.dataset.index = index;
      }
      list.children[index].querySelector('input').checked = true;
      $('#set-search').value = '';
      updateSetChoices();
      form.querySelector('[data-set-ingredients]').closest('details').open = false;
    },
  });
  updateSetChoices();
}
function updateSetChoices() {
  const form = $('#set-form');
  const selected = [];
  for (const row of form.querySelectorAll('.set-choice')) {
    const food = setDraftFoods.get(form)[Number(row.dataset.index)], checked = row.querySelector('input').checked;
    row.hidden = !foodMatches(food, $('#set-search').value);
    row.querySelector('select').hidden = !checked;
    row.querySelector('select').disabled = !checked;
    if (checked) selected.push(food.name);
  }
  $('#set-selection').textContent = selected.length ? `選択中 · ${selected.join('、')}` : '食品を選んでください。';
}
function saveMeals(next, records, name, close) {
  next.meals.push(...records);
  return commitMeals(next, records, name, close);
}
function commitMeals(next, records, name, close) {
  const { date, mealSlot } = records[0];
  const destination = (date === today() ? '' : labelDate(date) + 'の') + mealSlotLabel(mealSlot);
  const saved = commit(next, `${destination}に${name}を記録。`, { celebrate: true, undoable: true, close, event: { kind: 'meal', ids: records.map(r => r.id), name } });
  if (saved && tab === 'food' && date === today() && selectedMealSlot !== mealSlot) { selectedMealSlot = mealSlot; render(); }
  return saved;
}
function offlineMarkup() {
  const o = offlineState();
  return `<h3>いつでも、相棒のそばに</h3><p>${o.available ? o.status === 'ready' ? 'オフラインの準備ができました。一度開いたこのURLから、通信がなくても記録できます。' : 'この端末に画面と相棒の画像を保存すると、通信がなくても起動できます。' : 'オフライン機能はHTTPS、またはこのPCのlocalhostで利用できます。'}</p>${o.available ? `<div class="settings-buttons">${o.status === 'ready' ? '<span class="offline-ready">✓ オフライン準備済み</span>' + button('check-update','更新を確認',{class:'text-button'}) : `<button class="button button-primary" data-action="enable-offline" ${o.status === 'loading' ? 'disabled' : ''}>${o.status === 'loading' ? '準備中…' : 'オフラインで使えるようにする'}</button>`}${o.installable ? button('install-app','この端末に追加',{class:'button button-light',icon:'plus'}) : ''}${o.update ? button('update-offline','新版を読み込む',{class:'button button-light'}) : ''}</div>` : ''}${o.status === 'error' ? '<p role="alert">準備できませんでした。通信とブラウザの空き容量を確認し、もう一度お試しください。</p>' : ''}<p class="field-help">初回の準備後は、通信があるうちに一度再読み込みしてください。ホーム画面への追加はブラウザのメニューからも行えます。端末間の同期はありません。記録のバックアップは引き続き必要です。</p>`;
}
function settingsModal() {
  const profileSummary = PROFILE_FIELDS.map(field => {
    const value = state.settings.profile[field.key];
    if (value === null) return `${field.label} ${field.key === 'calorieTarget' ? '自動' : '未入力'}`;
    return `${field.label} ${field.options ? field.options[value] : num(value) + field.unit}`;
  }).join(' / ');
  openModal('設定とバックアップ', '相棒との記録を、大切に。', `<div class="settings-section"><h3>記録を守る</h3><p>記録は、このブラウザだけに保存されています。ブラウザのデータ削除・端末の変更で失われるため、定期的にJSONバックアップを書き出してください。</p><p class="field-help">最終書き出し：${state.settings.dataSafety.lastBackupAt ? esc(new Date(state.settings.dataSafety.lastBackupAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })) : 'まだありません'}。書き出したファイルの保存先もご確認ください。</p><div class="settings-buttons">${button('export', 'バックアップを書き出す', { class: 'button button-primary', icon: 'download' })}${button('import', 'JSONから復元', { class: 'button button-light', icon: 'upload' })}</div><input id="import-file" type="file" accept="application/json,.json" hidden>${storageError ? `${button('export-raw', '読み込めなかった元データを保存', { class: 'text-button' })}<p class="field-help">正常なバックアップを復元するまで、新しい記録は保存しません。</p>` : ''}</div>
    <div class="settings-section"><h3>相棒の姿</h3><p>好きな体つきから育てられます。変更しても、記録・XP・レベルはそのままです。</p>${button('body-type', '相棒の体つきを選ぶ', { class: 'button button-light' })}${wardrobeEntry(state.settings.bodyType)}</div>
    <div class="settings-section"><h3>相棒の背景</h3><p>旅の景色は今いる章と端末の時刻に合わせて変わります。休養中は落ち着いた空になります。</p>${backgroundModeOptions(state)}${button('milestones', '記念品の背景を選ぶ', { class: 'text-button' })}</div>
    <div class="settings-section profile-settings"><h3>あなたのプロフィール</h3><p>${profileSummary}</p><p>各項目はいつでも変更・消去できます。</p><div class="settings-buttons">${button('profile', 'プロフィールを編集', { class: 'button button-light', icon: 'edit' })}${button('calorie-setup', 'カロリーの目安を設定', { class: 'button button-light' })}</div></div>
    <div class="settings-section" id="offline-settings">${offlineMarkup()}</div><div class="settings-section"><h3>休養モード</h3><p>長めにお休みするときに。休養の期間を残し、相棒もひと休みの表示になります。今日だけの休養日は、今日の画面から記録できます。</p><div class="setting-row"><span>${summary.paused ? 'オン · ゆっくり休もう' : 'オフ'}</span><button class="switch ${summary.paused ? 'on' : ''}" role="switch" aria-checked="${summary.paused}" aria-label="休養モード" data-action="pause"><span></span></button></div><small class="field-help">オンでもオフでも、休養でXP・レベル・体形は失いません。休養中も記録できます。</small></div>
    <div class="settings-section"><h3>表示と音</h3><div class="setting-row"><span>動きを減らす</span><button class="switch ${state.settings.reducedMotion ? 'on' : ''}" role="switch" aria-checked="${state.settings.reducedMotion}" aria-label="動きを減らす" data-action="motion"><span></span></button></div><div class="setting-row"><span>記録したときの音</span><button class="switch ${state.settings.sound ? 'on' : ''}" role="switch" aria-checked="${state.settings.sound}" aria-label="記録したときの音" data-action="sound"><span></span></button></div><p class="field-help">端末側の「視差効果を減らす」設定にも対応します。</p></div>
    <div class="settings-section about"><h3>そだて筋について</h3><p>個人用プロトタイプ v${APP_VERSION} · データ形式 v${state.schemaVersion} · ゲームルール v${RULES.version}<br>日本時間で日付を管理します。ゲーム内の数値は、現実の筋肉量や運動効果の推定ではありません。名称・デザイン・成長速度は調整中です。</p></div>`);
}
function previewModal() {
  previewStages = Object.fromEntries(PARTS.map(p => [p.id, { shape: Math.round(partShape(summary.parts[p.id])) }])); previewBack = back;
  openModal('相棒の成長イメージ', '8部位を1〜999で試せます。記録やレベルは変わりません。', `<div class="shape-presets" aria-label="5つの基準形">${SHAPE_ANCHORS.map((value, i) => button('preview-preset', `<span class="shape-thumb">${characterSVG(Object.fromEntries(PARTS.map(p => [p.id, { shape: value }])), { bodyType: state.settings.bodyType, preview: true })}</span><strong>${SHAPE_NAMES[i]}</strong><small>${value}</small>`, { id: String(value), class: 'shape-preset' })).join('')}</div><div class="preview-layout"><div class="preview-stage"><div class="preview-character" id="preview-character"></div>${button('preview-turn', '正面 / 後ろ姿', { class: 'button button-light', icon: 'turn' })}<p id="preview-facing" class="field-help"></p></div><div class="preview-controls">${PARTS.map(p => `<div class="preview-range"><label for="shape-${p.id}">${p.name}</label><input id="shape-${p.id}" type="range" name="${p.id}" min="1" max="999" value="${previewStages[p.id].shape}" aria-label="${p.name}の成長量"><input type="number" name="${p.id}" min="1" max="999" step="1" value="${previewStages[p.id].shape}" aria-label="${p.name}の値"></div>`).join('')}<div class="preview-examples">${button('preview-mixed', '胸800・肩200を試す', { class: 'button button-light' })}${button('preview-current', 'いまの相棒に戻す', { class: 'text-button' })}</div></div></div><p class="field-help shape-note">1〜999は体形の確認用の値です。1つずつの小さな差は数字で、まとまった変化は輪郭と陰影で確認できます。実際の育成も同じ形状値で描画し、累計${num(RULES.shapeXPMax)}XPで999に届きます。</p>`, true);
  paintCharacters($('#modal'));
  updatePreview();
}
function updatePreview() {
  $('#preview-character').innerHTML = characterSVG(previewStages, { bodyType: state.settings.bodyType, back: previewBack, preview: true });
  $('#preview-facing').textContent = previewBack ? '後ろ姿 · 背中とお尻をチェック' : '正面 · 胸とお腹をチェック';
  document.querySelectorAll('.preview-range input').forEach(input => { input.value = previewStages[input.name].shape; });
  document.querySelectorAll('.shape-preset').forEach(btn => { btn.setAttribute('aria-pressed', String(PARTS.every(p => previewStages[p.id].shape === Number(btn.dataset.id)))); });
  paintCharacters($('#preview-character'));
}
function download(data, filename) {
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
document.addEventListener('click', event => {
  if (arrivalPlayer.isPlaying()) arrivalPlayer.cancel();
  const target = event.target.closest('[data-action]');
  if (!target) return;
  event.preventDefault();
  const { action, id: itemId } = target.dataset;
  if (action === 'count-up' || action === 'count-down') {
    const input = target.form.elements.count;
    const step = countStep(exById(itemId).unit);
    input.value = Math.max(1, Math.min(86400, (Math.floor(input.valueAsNumber) || 0) + (action === 'count-up' ? step : -step)));
    updateQuickSet(input.form);
    target.form.querySelector('output').textContent = `${input.value}${exById(itemId).unit}`;
    return;
  }
  if (['quick-workout', 'quick-food', 'log-set'].includes(action) && repeatedQuickTap(action, itemId)) return;
  if (recordReaction && !['quick-workout', 'quick-food', 'log-set'].includes(action)) stopRecordCelebration(true);
  const next = clone(state);
  switch (action) {
    case 'home': case 'tab': { const route = action === 'home' ? 'home' : itemId; if (!tabs.includes(route)) break; closeModal(); if (location.hash.slice(1) === route) showRoute(); else location.hash = route; break; }
    case 'weight-entry': weightForm(); break;
    case 'workout-sheet': workoutSheet(); break;
    case 'calorie-setup': calorieSetupModal(); break;
    case 'enable-offline': enableOffline(); break;
    case 'install-app': showInstallHelp(); break;
    case 'dismiss-install': if (saveSafety({ installDismissed: true })) render(); break;
    case 'check-update': checkOfflineUpdate().then(found => toast(found ? '新版を準備しています。準備後に「新版を読み込む」が表示されます。' : '最新の状態です。')).catch(() => toast('更新を確認できませんでした。通信を確認してください。')); break;
    case 'update-offline': updateOffline(); break;
    case 'settings': settingsModal(); break;
    case 'profile': profileModal(); break;
    case 'body-type': bodyTypeModal(); break;
    case 'body-type-back': bodyTypeBack = !bodyTypeBack; updateBodyTypePreview(); break;
    case 'clear-profile': next.settings.profile = emptyProfile(); saveProfile(next, 'プロフィールを消去しました。'); break;
    case 'partner-name': partnerNameModal(); break;
    case 'today-workouts': {
      const records = allRecords().filter(r => r.kind === 'workout' && r.exerciseId === itemId && r.date === today());
      if (records.length === 1) workoutForm(itemId, records[0]);
      else if (records.length) openModal(`今日の${exById(itemId).name}`, `${records.length}件の記録`, recordsList(records));
      break;
    }
    case 'calendar-day':
      target.focus({ preventScroll:true });
      historyLimit = 30; historyModal(itemId); $('#modal').scrollTop = 0; break;
    case 'history': historyLimit = 30; historyModal(); break;
    case 'receipt-history': { const result = visibleFeedback(); if (!result) break; historyFilters = { query: '', kind: result.kind === 'workout' ? 'workout' : result.kind === 'meal' ? 'food' : '', from: result.date, to: result.date }; historyLimit = 30; historyModal(); break; }
    case 'more-history': historyLimit += 30; updateHistory(); break;
    case 'clear-history': historyFilters = {query:'',kind:'',from:'',to:''}; historyLimit=30; historyModal(); $('#history-search').focus(); break;
    case 'growth-turn': {
      flippedGrowthExercise = flippedGrowthExercise === itemId ? '' : itemId;
      const oldPanel = target.closest('.exercise-growth'), ex = exById(itemId);
      oldPanel.outerHTML = oneSetGrowthView(ex);
      const panel = $('.exercise-growth');
      void paintCharacters(panel);
      panel.querySelector('.growth-turn').focus({ preventScroll: true });
      break;
    }
    case 'new-exercise': customExerciseModal(); break;
    case 'edit-custom-exercise': customExerciseModal(state.customExercises.find(row => row.id === itemId)); break;
    case 'remove-custom-exercise': {
      const row = state.customExercises.find(row => row.id === itemId);
      if (!row || customExerciseInUse(itemId) || !checkEditTarget(activeEntryForm())) break;
      confirmAction('自作種目を削除', `「${row.name}」を一覧から削除します。`, () => {
        if (customExerciseInUse(itemId) || JSON.stringify(state.customExercises.find(ex => ex.id === itemId)) !== JSON.stringify(row)) return saveFailure('この種目が更新されました。一覧で最新の内容を確認してください。');
        const next = clone(state);
        next.customExercises = next.customExercises.filter(ex => ex.id !== itemId);
        next.settings.favorites = next.settings.favorites.filter(id => id !== itemId);
        commit(next, '自作種目を削除しました。');
      }); break;
    }
    case 'toggle-exercise-group': {
      if (openExerciseGroups.has(itemId)) openExerciseGroups.delete(itemId);
      else openExerciseGroups.add(itemId);
      filterExercises(); break;
    }
    case 'recent-exercise': {
      openExerciseGroups.add(exerciseGroup(exById(itemId)));
      selectedExercise = itemId;
      filterExercises();
      const editorButton = $(`[data-action="select-exercise"][data-id="${itemId}"]`);
      editorButton.focus({ preventScroll: true });
      editorButton.scrollIntoView({ block: 'start', behavior: 'instant' });
      break;
    }
    case 'select-exercise': {
      selectedExercise = selectedExercise === itemId ? '' : itemId;
      filterExercises();
      if (target.getBoundingClientRect().top < 0) target.scrollIntoView({block:'start', behavior:'instant'});
      break;
    }
    case 'clear-exercise-search': {
      exercisePart = ''; exerciseQuery = ''; customOnly = false; openExerciseGroups.clear(); selectedExercise = ''; $('#exercise-custom-only').checked = false; $('#exercise-search').value = ''; $('#exercise-part').value = '';
      filterExercises(); $('#exercise-search').focus(); break;
    }
    case 'more-part-records': if (activePartDetail) partModal(activePartDetail, true); break;
    case 'part-exercises': {
      if (!PARTS.some(part => part.id === itemId)) break;
      exercisePart = itemId; exerciseQuery = ''; customOnly = false;
      openExerciseGroups.clear();
      for (const ex of findExercises('', itemId, state)) openExerciseGroups.add(exerciseGroup(ex));
      closeModal();
      if (location.hash.slice(1) === 'workout') showRoute();
      else location.hash = 'workout';
      break;
    }
    case 'chart-range':
      chartRange = itemId === 'all' ? 'all' : Number(itemId);
      render(); break;
    case 'calendar-month': {
      const first = (calendarMonth || today().slice(0, 7)) + '-01';
      calendarMonth = shiftDate(first, itemId === 'prev' ? -1 : 31).slice(0, 7);
      render(); break;
    }
    case 'journey-peek':
      journeyDestination = itemId;
      location.hash = 'journey'; break;
    case 'notebook': notebookModal(itemId); break;
    case 'exercise-history': exerciseHistoryModal(itemId); break;
    case 'compare-turn': comparisonBack = !comparisonBack; render(); break;
    case 'more-memories': memoryLimit += 12; render(); break;
    case 'timer': openModal('ひと休みタイマー', '次のセットまで、好きな時間でひと休み。', `<div class="timer-presets">${[30,60,90,120,180].map(n=>button('timer-start',`${n}秒`,{id:String(n),class:'button button-light'})).join('')}</div><form id="timer-form"><label class="field">時間を決める<div class="input-unit"><input type="number" name="seconds" value="90" min="1" max="3600" step="1" inputmode="numeric" required><span>秒</span></div></label><p class="field-help">記録や経験値は増えません。音は設定でオンにできます。画面を閉じている間の通知には対応していません。</p>${formActions('タイマーを開始')}</form>`); break;
    case 'timer-start': closeModal(); restTimer.start(Number(itemId)); break;
    case 'weekly-goal': weeklyGoalModal(); break;
    case 'weekly-digest': digestOffset = 0; digestBack = false; weeklyDigestModal(); break;
    case 'weekly-digest-week': if (itemId === '0' || itemId === '-1') { digestOffset = Number(itemId); weeklyDigestModal(action); } break;
    case 'weekly-digest-turn': digestBack = !digestBack; weeklyDigestModal(action); break;
    case 'turn': back = !back; render(); break;
    case 'show-back': back = true; render(); break;
    case 'journey-compare':
      compareBefore = itemId === 'before' && !!recordComparison;
      if (tab !== 'journey') { journeyDestination = 'comparison'; location.hash = 'journey'; }
      else render();
      break;
    case 'companion-talk': conversationOffset = 0; openModal('相棒と話す', '', conversationContent(state, companionConversation(state, today(), { offset: conversationOffset }))); break;
    case 'companion-talk-next': conversationOffset++; openModal('相棒と話す', '', conversationContent(state, companionConversation(state, today(), { offset: conversationOffset }))); $('#modal [data-action="companion-talk-next"]')?.focus({ preventScroll: true }); break;
    case 'story': storyModal(itemId); break;
    case 'story-reply': {
      const chapter = currentJourney().story.chapters.find(c => c.id === itemId && c.earned);
      const choice = chapter?.conversation?.choices.find(c => c.id === target.dataset.choice);
      if (!choice || chapter.conversation.selected?.id === choice.id) break;
      next.settings.storyReplies[itemId] = choice.id;
      if (commit(next, '相棒への返事を残しました。', { close: false })) storyModal(itemId, true);
      break;
    }
    case 'story-read': {
      const chapter = currentJourney().story.chapters.find(c => c.id === itemId && c.earned);
      if (!chapter || chapter.read) break;
      next.collection.storiesRead.push(itemId);
      if (commit(next, 'このお話に、しおりを挟みました。', { close: false, undoable: false })) storyModal(itemId, true);
      break;
    }
    case 'story-pin': {
      const chapter = currentJourney().story.chapters.find(c => c.id === itemId && c.earned);
      if (!chapter) break;
      next.settings.storyPin = state.settings.storyPin === itemId ? null : itemId;
      if (commit(next, next.settings.storyPin ? `${chapter.gift}を相棒のそばに飾りました。` : '飾りを外しました。', { close: false })) storyModal(itemId, true);
      break;
    }
    case 'home-speech': if (displayedVoice) { openModal('相棒のことば', '', `<blockquote class="home-voice-full">${esc(displayedVoice.line)}</blockquote>`); rememberCompanionExperience(); } break;
    case 'background-mode': if (['studio', 'journey', 'souvenir'].includes(itemId)) {
      next.settings.backgroundMode = itemId;
      const modalOpen = $('#modal').open, inSettings = !!$('#modal #offline-settings');
      if (commit(next, { studio: 'スタジオにしました。', journey: '旅の景色にしました。', souvenir: '記念品の背景にしました。' }[itemId], { close: false })) {
        if (!modalOpen) break;
        if (inSettings) settingsModal(); else milestonesModal();
        $(`#modal [data-action="background-mode"][data-id="${itemId}"]`)?.focus({ preventScroll: true });
      }
    } break;
    case 'wardrobe': wardrobeOrigin = !$('#modal').open ? 'journey' : $('#modal #offline-settings') ? 'settings' : 'milestones'; wardrobeBack = back; wardrobeModal(); break;
    case 'wardrobe-return': if (wardrobeOrigin === 'journey') { closeModal(); break; } if (wardrobeOrigin === 'settings') settingsModal(); else milestonesModal(); $('#modal [data-action="wardrobe"]')?.focus(); break;
    case 'wardrobe-turn': wardrobeBack = !wardrobeBack; wardrobeModal({ keepScroll: true, action }); break;
    case 'wardrobe-wear': case 'wardrobe-color': case 'wardrobe-item': {
      const choices = wardrobeOf(state.settings), available = wardrobeProgress(state).unlocked;
      if (action === 'wardrobe-wear') {
        if (!['growth', 'none'].includes(itemId) || choices.wear === itemId) break;
        choices.wear = itemId;
      } else if (action === 'wardrobe-color') {
        if (!['sand', 'navy'].includes(itemId) || (itemId === 'navy' && !available.navy) || choices.color === itemId) break;
        choices.color = itemId;
      } else {
        if (!['towel', 'wristbands'].includes(itemId)) break;
        if (choices.accessories.includes(itemId)) choices.accessories = choices.accessories.filter(id => id !== itemId);
        else if (available[itemId]) choices.accessories.push(itemId);
        else break;
      }
      next.settings.wardrobe = choices;
      if (commit(next, '相棒の装いを変えました。', { close: false })) wardrobeModal({ keepScroll: true, action, itemId });
      break;
    }
    case 'milestones': milestonesModal(); break;
    case 'title-badge': if (currentJourney().milestones.days >= 7) { next.settings.titleBadge = !state.settings.titleBadge; const modalOpen = $('#modal').open; if (commit(next, next.settings.titleBadge ? '称号を付けました。' : '称号を外しました。', { close: false }) && modalOpen) milestonesModal(); } break;
    case 'scene': { const scene = SCENES.find(s => s.id === itemId); if (!scene || currentJourney().milestones.days < scene.days) break; next.settings.scene = itemId; next.settings.backgroundMode = 'souvenir'; const modalOpen = $('#modal').open; if (commit(next, `${scene.name}にしました。`, { close: false }) && modalOpen) milestonesModal(); break; }
    case 'part': partModal(itemId); break;
    case 'preview': previewModal(); break;
    case 'preview-turn': previewBack = !previewBack; updatePreview(); break;
    case 'preview-preset': previewStages = Object.fromEntries(PARTS.map(p => [p.id, { shape: Number(itemId) }])); updatePreview(); break;
    case 'preview-mixed': previewStages = Object.fromEntries(PARTS.map(p => [p.id, { shape: p.id === 'chest' ? 800 : p.id === 'shoulders' ? 200 : 500 }])); previewBack = false; updatePreview(); break;
    case 'preview-current': previewStages = Object.fromEntries(PARTS.map(p => [p.id, { shape: Math.round(partShape(summary.parts[p.id])) }])); previewBack = back; updatePreview(); break;
    case 'close-modal': closeModal(); break;
    case 'confirm': { const run = pendingConfirm; pendingConfirm = null; run?.(); break; }
    case 'dismiss-stage': if (feedback) feedback = { ...feedback, stageChanges: [] }; render(); break;
    case 'dismiss-toast': $('#toast').classList.remove('visible'); break;
    case 'quick-workout': { if (workoutDrafts.has(itemId)) { workoutSetsModal(workoutDrafts.get(itemId)); break; } const record = makeWorkout(state, itemId); next.workouts.push(record); commit(next, `${exById(itemId).name}を記録。`, { celebrate: true, close: !!target.closest('#modal'), originElement: target, event: { kind: 'workout', id: record.id } }); break; }
    case 'workout-by-set': {
      const form = $('#workout-form'); if (!form || form.dataset.record) break;
      try { const draft = createWorkoutSetDraft(form.dataset.exercise, Object.fromEntries(new FormData(form)), state); workoutSetsModal(draft, null, { field: 'count', rowIndex: 0 }); }
      catch (error) { formError(form, error.message); form.elements.namedItem(error.field)?.focus(); }
      break;
    }
    case 'workout-set-add': case 'workout-set-remove': changeWorkoutSetRows(action, Number(target.dataset.index)); break;
    case 'workout-previous-sets': openPreviousWorkout(itemId); break;
    case 'workout-resume': if (workoutDrafts.has(itemId)) workoutSetsModal(workoutDrafts.get(itemId)); break;
    case 'workout-set-discard': {
      const form = $('#workout-sets-form'); if (!form) break;
      form.dataset.draftCleared = 'true'; workoutDrafts.remove(form.dataset.exercise); closeModal(); render(); toast('この下書きを破棄しました。保存済みの記録はそのままです。'); break;
    }
    case 'workout-set-timer': {
      const form = $('#workout-sets-form'); if (!form) break;
      timerDraftExercise = form.dataset.exercise; captureWorkoutDraft();
      openModal('ひと休みタイマー', '入力したセットは下書きに残っています。', `<div class="timer-presets">${[30,60,90,120,180].map(seconds => button('timer-start', `${seconds}秒`, { id: String(seconds), class: 'button button-light' })).join('')}</div>${button('workout-resume', 'セットの入力に戻る', { id: timerDraftExercise, class: 'button button-light' })}<p class="field-help">ページを閉じずに、筋トレの「入力の続き」から戻れます。入力はまだ実績に保存していません。</p>`);
      break;
    }
    case 'workout-form': {
      const setForm = target.closest('.quick-set-card')?.querySelector('.quick-set-form');
      const weight = setForm?.elements.weight;
      if (weight && !weight.reportValidity()) break;
      const values = setForm ? { count:setForm.elements.count.value, weight:readQuickWeight(setForm) } : undefined;
      workoutForm(itemId, null, values);
      break;
    }
    case 'favorites': favoritesModal(); break;
    case 'meal-slot': if (Object.hasOwn(MEAL_SLOTS, itemId)) { selectedMealSlot = itemId; render(); } break;
    case 'meal-log': {
      const group = document.getElementById('meal-log-' + itemId);
      if (group) { group.focus({ preventScroll: true }); group.scrollIntoView({ block: 'start' }); }
      break;
    }
    case 'repeat-meal': {
      const date = today();
      if (date !== lastDate) { refreshDate(); break; }
      const previous = previousMeal(state.meals, date, selectedMealSlot);
      if (previous?.date !== itemId) break;
      const records = previous.meals.map(meal => makeMeal(meal, date, meal.portions, selectedMealSlot));
      if (saveMeals(next, records, records.length + '品', false)) $('.meal-slots [aria-pressed=true]')?.focus({ preventScroll: true });
      break;
    }
    case 'pick-meal-history': openMealReuse(); $('#meal-reuse-form [name=source]')?.focus(); break;
    case 'meal-reuse': openMealReuse(); break;
    case 'quick-food': { const food = state.foods.find(f => f.id === itemId); if (food) saveMeals(next, [makeMeal(food, today(), 1, tab === 'food' ? selectedMealSlot : suggestedMealSlot())], food.name, false); break; }
    case 'ingredient-picker': openIngredientPicker(); break;
    case 'food-browse': toggleFoodResults(!foodBrowseOpen); break;
    case 'expand-foods': expandedFoods = !expandedFoods; updateFoodResults(); ($('#food-results [data-action="expand-foods"]') || $('#food-search')).focus({ preventScroll: true }); break;
    case 'today-meals': $('#today-meals').focus({ preventScroll: true }); $('#today-meals').scrollIntoView({ block: 'start' }); break;
    case 'portion-food': portionForm(itemId, 'food'); break;
    case 'portion-set': portionForm(itemId, 'set'); break;
    case 'meal-photo': openMealPhoto(); break;
    case 'quick-meal-entry': quickMealForm(); break;
    case 'reuse-meal': {
      const meal = state.meals.find(row => row.id === itemId);
      if (meal) quickMealForm(meal);
      break;
    }
    case 'new-food': foodForm(); break;
    case 'food-edit': foodForm(state.foods.find(f => f.id === itemId)); break;
    case 'new-set': setForm(); break;
    case 'edit-set': setForm(state.mealSets.find(s => s.id === itemId)); break;
    case 'delete-set': confirmAction('食事セットを削除', 'セットだけを削除します。記録済みの食事は残ります。', () => { next.mealSets = next.mealSets.filter(s => s.id !== itemId); commit(next, '食事セットを削除しました。'); }); break;
    case 'log-set': {
      const set = state.mealSets.find(s => s.id === itemId);
      if (set) saveMeals(next, set.foodIds.map((id, i) => makeMeal(state.foods.find(f => f.id === id), today(), set.portions?.[i], selectedMealSlot)), set.name, false);
      break;
    }
    case 'reload-edit': {
      const edit = editingDrafts.get(activeEntryForm());
      const current = edit && state[edit.list].find(row => row.id === edit.original.id);
      if (current && edit.list === 'workouts') workoutForm(current.exerciseId, current);
      else if (current && edit.list === 'weights') weightForm(current);
      else if (current && edit.list === 'customExercises') customExerciseModal(current);
      else if (current) foodForm(edit.list === 'foods' ? current : null, edit.list === 'meals' ? current : null);
      if (current) attachHistoryReturn(edit.historyScroll);
      break;
    }
    case 'edit-record': {
      const scroll = target.closest('#history-results') ? $('#modal').scrollTop : undefined;
      const workout = state.workouts.find(r => r.id === itemId), meal = state.meals.find(r => r.id === itemId);
      const weight = state.weights.find(r => r.id === itemId);
      if (weight) weightForm(weight);
      else if (workout) workoutForm(workout.exerciseId, workout);
      else if (meal) foodForm(null, meal);
      if (workout || meal || weight) attachHistoryReturn(scroll);
      break;
    }
    case 'history-back': {
      const edit = editingDrafts.get(activeEntryForm());
      if (edit) restoreHistory(edit.original.id, edit.historyScroll);
      break;
    }
    case 'history-delete-back': {
      pendingConfirm = null;
      restoreHistory(itemId, Number(target.dataset.scroll), { focusAction:'delete-record' });
      break;
    }
    case 'history-undo-edit': {
      if (!recordUndoState) break;
      const scroll = $('#modal').scrollTop;
      if (commit(undoRecordWithSettings(recordUndoState, state), '訂正を取り消しました。', { close:false, resetContext:true, undoable:false })) {
        quickTaps.clear(); restoreHistory(itemId, scroll, { message:'訂正を取り消しました。' });
      }
      break;
    }
    case 'delete-record': {
      const kind = target.closest('.record-row').dataset.kind;
      const scroll = target.closest('#history-results') ? $('#modal').scrollTop : undefined;
      confirmAction('この記録を削除しますか？', '記録を削除し、経験値・レベル・思い出を再計算します。削除直後は取り消せます。', () => {
        if (kind === 'weight') return commit(removeWeight(next, itemId), '体重の記録を削除しました。');
        if (kind === 'rest') next.restDays = next.restDays.filter(date => date !== itemId.slice(5));
        else if (kind === 'food') next.meals = next.meals.filter(row => row.id !== itemId);
        else if (kind === 'workout') next.workouts = next.workouts.filter(row => row.id !== itemId);
        commit(next, '記録を削除しました。');
      });
      if (scroll !== undefined) {
        const back = $('#modal .form-actions [data-action="close-modal"]');
        Object.assign(back.dataset, { action:'history-delete-back', id:itemId, scroll });
      }
      break;
    }
    case 'rest-day': if (next.restDays.includes(today())) next.restDays = next.restDays.filter(d => d !== today()); else next.restDays.push(today()); commit(next, next.restDays.includes(today()) ? '今日は、ゆっくり整える日に。' : '休養日の記録を取り消しました。', { event: next.restDays.includes(today()) ? { kind: 'rest' } : null }); break;
    case 'pause': {
      const period = next.restPeriods.find(p => p.end === null);
      if (period) period.end = today();
      else { const last = next.restPeriods.find(p => p.end === today()); if (last) last.end = null; else next.restPeriods.push({ start: today(), end: null }); }
      if (commit(next, period ? '休養モードを解除しました。' : '休養モードにしました。', { close: false })) settingsModal(); break;
    }
    case 'motion': case 'sound': { const key = action === 'motion' ? 'reducedMotion' : 'sound'; next.settings[key] = !next.settings[key]; if (commit(next, '設定を保存しました。', { close: false })) { settingsModal(); $('#modal').querySelector(`[data-action="${action}"]`)?.focus({ preventScroll: true }); } break; }
    case 'undo-record': {
      if (!recordUndoState) break;
      const exerciseId = target.closest('.exercise-choice')?.dataset.exerciseId;
      const previous = undoRecordWithSettings(recordUndoState, state);
      const message = feedback?.kind === 'edit' ? '訂正を取り消しました。' : '直前の記録を取り消しました。';
      if (commit(previous, message, { resetContext: true })) {
        undoState = null; quickTaps.clear(); $('#toast').querySelector('[data-action="undo"]')?.remove();
        if (exerciseId) document.querySelector(`.exercise-toggle[data-id="${exerciseId}"]`)?.focus({ preventScroll:true });
      }
      break;
    }
    case 'undo': {
      if (!undoState) break;
      const previous = clone(undoState);
      previous.settings.dataSafety = clone(state.settings.dataSafety);
      previous.settings.insightHistory = clone(state.settings.insightHistory);
      if (commit(previous, '直前の操作を取り消しました。', { resetContext: !undoWasSettings })) { undoState = null; quickTaps.clear(); $('#toast').querySelector('[data-action="undo"]')?.remove(); }
      break;
    }
    case 'export': exportBackup(); break;
    case 'export-raw': download(sourceRaw || '', `sodatekin-recovery-${today()}.json`); break;
    case 'import': $('#import-file').click(); break;
  }
});

document.addEventListener('toggle', event => {
  if (!event.target.isConnected) return;
  if (event.target.matches('.receipt-breakdown')) receiptExpanded = event.target.open;
  if (event.target.matches('.home-today')) homeTodayExpanded = event.target.open;
}, true);

document.addEventListener('submit', event => {
  const form = event.target; event.preventDefault();
  if (form.id === 'exercise-search-form') {
    filterExercises(true);
    const result = $('.exercise-group[open]:not([hidden]) .exercise-choice:not([hidden]) .exercise-toggle') || $('.exercise-group:not([hidden]) summary') || $('[data-action="new-exercise"]');
    result.focus();
    return;
  }
  if (!checkEditTarget(form)) return;
  if (form.dataset.exercise && !exById(form.dataset.exercise)) return formError(form, 'この種目が見つかりません。種目一覧で選び直してください。');
  const data = new FormData(form), next = clone(state);
  try {
    if (form.id === 'weight-form') {
      const kg = parseWeightText(data.get('kg')), date = data.get('date');
      const original = editingDrafts.get(form)?.original;
      if (!withinInputWindow(date) && date !== original?.date) return formError(form, '記録日は今日から7日前までを選んでください。');
      if (original) {
        if (state.weights.some(row => row.date === date && row.id !== original.id)) return formError(form, 'この日には体重の記録があります。履歴でその日の記録を編集してください。');
        const edited = upsertWeight(removeWeight(state, original.id), { ...original, date, kg });
        saveRecordEdit(form, edited, original, date, '体重の記録を更新しました。');
      } else {
        const saved = upsertWeight(state, { date, kg, createdAt: new Date().toISOString() });
        commit(saved, '体重を記録しました', { event: { kind: 'weight', id: saved.weights.find(row => row.date === date).id } });
      }
    } else if (form.id === 'custom-exercise-form') {
      const original = editingDrafts.get(form)?.original;
      const row = { id: original?.id || `custom-${id()}`, name: data.get('name'), category: form.elements.category.value, part: form.elements.part.value, unit: form.elements.unit.value, count: Number(data.get('count')), sets: Number(data.get('sets')) };
      if (original && ['category','part','unit'].some(key => original[key] !== row[key])) {
        if (customExerciseInUse(original.id)) return formError(form, 'この種目の記録または下書きがあります。種類・部位・単位を変更するには新しい種目を作成してください。');
        // A draft open in another tab must not be saved under a different unit or body part.
        row.id = `custom-${id()}`;
        next.settings.favorites = next.settings.favorites.map(id => id === original.id ? row.id : id);
      }
      const rows = original ? next.customExercises.map(ex => ex.id === original.id ? row : ex) : [...next.customExercises, row];
      next.customExercises = validateCustomExercises(rows);
      if (commit(next, original ? '自作種目を更新しました。' : '種目を作成しました。')) {
        exerciseQuery = ''; exercisePart = ''; customOnly = true; selectedExercise = row.id;
        openExerciseGroups.clear(); openExerciseGroups.add(row.category); render();
        const toggle = document.querySelector(`.exercise-toggle[data-id="${row.id}"]`);
        if (toggle) {
          modalOrigin = { element: toggle, hash: location.hash };
          toggle.focus({ preventScroll: true });
          toggle.scrollIntoView({ block: 'nearest', behavior: 'instant' });
        }
      }
    } else if (form.matches('.quick-set-form')) {
      const exerciseId = form.dataset.exercise, input = form.elements.count;
      if (form.dataset.date !== today()) { refreshDate(); toast('日付が変わりました。今日の内容を確認してください。'); return; }
      if (!form.reportValidity() || repeatedQuickTap('quick-workout', exerciseId)) return;
      const weight = readQuickWeight(form);
      const record = makeWorkout(state, exerciseId, { count:input.valueAsNumber, sets:1, weight });
      next.workouts.push(record);
      commit(next, `${exById(exerciseId).name}を1セット記録。`, { celebrate:true, close:!!form.closest('#modal'), originElement:form.querySelector('[type=submit]'), event:{ kind:'workout', id:record.id } });
    } else if (form.id === 'timer-form') { restTimer.start(Number(data.get('seconds'))); closeModal();
    } else if (form.id === 'workout-form') {
      const existing = state.workouts.find(r => r.id === form.dataset.record);
      if (form.dataset.record && !existing) return formError(form, 'この筋トレの記録は、すでに削除されています。');
      if (!withinInputWindow(data.get('date')) && data.get('date') !== existing?.date) return formError(form, '実施日は今日から7日前までを選んでください。');
      const values = { count: Number(data.get('count')), sets: Number(data.get('sets')), weight: data.get('weight') === '' ? null : Number(data.get('weight')), date: data.get('date'), memo: data.get('memo').trim() };
      if (existing) {
        next.workouts = next.workouts.map(r => r.id === existing.id ? { ...r, ...values } : r);
        saveRecordEdit(form, next, existing, values.date, '筋トレの記録を更新しました。');
      } else {
        const record = makeWorkout(state, form.dataset.exercise, values);
        next.workouts.push(record);
        commit(next, `${exById(form.dataset.exercise).name}を記録。`, { celebrate:true, originElement:event.submitter, event:{ kind:'workout', id:record.id } });
      }
    } else if (form.id === 'workout-sets-form') {
      const draft = readWorkoutSetDraft(form);
      workoutDrafts.put(draft, state);
      let records;
      try { records = makeWorkoutSetRecords(state, draft); }
      catch (error) { workoutSetsModal(draft, error); return; }
      next.workouts.push(...records);
      form.dataset.draftCleared = 'true';
      if (commit(next, `${exById(draft.exerciseId).name}の${records.length}セットを記録。`, { celebrate: true, originElement: event.submitter, event: { kind: 'workout', id: records.at(-1).id, ids: records.map(record => record.id) } })) { workoutDrafts.remove(draft.exerciseId); render(); }
      else delete form.dataset.draftCleared;
    } else if (form.id === 'portion-form') {
      const date = data.get('date');
      if (!withinInputWindow(date)) return formError(form, '記録日は今日から7日前までを選んでください。');
      const set = form.dataset.mode === 'set' ? state.mealSets.find(s => s.id === form.dataset.id) : null;
      const ids = set?.foodIds || [form.dataset.id], portions = data.getAll('portions').map(Number);
      const records = ids.flatMap((id, i) => portions[i] === 0 ? [] : [makeMeal(state.foods.find(f => f.id === id), date, portions[i], data.get('mealSlot'))]);
      if (!records.length) return formError(form, '食べた食品を1つ以上選んでください。');
      saveMeals(next, records, set?.name || records[0].name, true);
    } else if (form.id === 'food-form') {
      const existing = state.meals.find(r => r.id === form.dataset.record);
      const food = state.foods.find(f => f.id === form.dataset.food);
      const registerOnly = event.submitter?.name === 'registerOnly';
      if (registerOnly && [...form.querySelectorAll('input:not([type=date])')].some(field => !field.reportValidity())) return;
      const date = data.get('date');
      if (!food && !registerOnly && !withinInputWindow(date) && date !== existing?.date) return formError(form, '記録日は今日から7日前までを選んでください。');
      const values = foodFormValues(data);
      if (!values.name) return formError(form, '食品名を入力してください。');
      if (existing) {
        next.meals = next.meals.map(r => r.id === existing.id ? { ...r, ...values, date, mealSlot: data.get('mealSlot') || undefined, portions: Number(data.get('portions')) } : r);
        saveRecordEdit(form, next, existing, date, '食事の記録を更新しました。');
      } else if (food) {
        next.foods = next.foods.map(f => f.id === food.id ? { ...f, ...values } : f);
        commit(next, '定番の食品を更新しました。');
      } else if (registerOnly) {
        const match = matchingFood(state.foods, values);
        const item = match ?? { ...values, id: id(), icon: 'meal' };
        if (match) closeModal();
        else {
          next.foods.unshift(item);
          if (!commit(next, `「${item.name}」を自分の食品に追加しました。`)) return;
        }
        foodBrowseOpen = true; foodCategory = foodGroup(item); foodQuery = item.name; expandedFoods = false;
        render();
      } else if (form.hasAttribute('data-package-entry')) {
        const registered = registerAndRecordFood(next, {
          ...values, portions: Number(data.get('portions')), mealSlot: data.get('mealSlot'), date, createdAt: new Date().toISOString(),
        });
        commitMeals(registered, [registered.meals.at(-1)], values.name, true);
      } else {
        const newFood = { ...values, id: id(), icon: 'meal' };
        if (data.has('saveFood')) next.foods.unshift(newFood);
        saveMeals(next, [makeMeal(newFood, date, Number(data.get('portions')), data.get('mealSlot'))], newFood.name, true);
      }
    } else if (form.id === 'body-type-form') {
      next.settings.bodyType = data.get('bodyType');
      commit(next, '相棒の姿を変更しました。記録と育った分はそのままです。');
    } else if (form.id === 'calorie-setup-form') {
      const reset = event.submitter?.name === 'resetTarget';
      if (reset) data.set('calorieTarget', '');
      const draft = profileDraft(next.settings.profile, data);
      if (!reset && effectiveTarget(draft, latestKg()).source === 'none') {
        return formError(form, '自動の目安に必要な項目を入力するか、目標カロリーを手で入力してください。');
      }
      next.settings.profile = draft;
      saveProfile(next, reset ? '自動の目安に戻しました。' : 'カロリーの目安を保存しました。');
    } else if (form.id === 'profile-form') {
      next.settings.profile = profileFromForm(data);
      saveProfile(next, 'プロフィールを保存しました。');
    } else if (form.id === 'weekly-goal-form') {
      next.settings.weeklyGoal = data.get('weeklyGoal') === '' ? null : Number(data.get('weeklyGoal'));
      commit(next, '今週からのペースを保存しました。');
    } else if (form.id === 'partner-name-form') {
      const name = data.get('partnerName').trim();
      if (!name) return formError(form, '名前を入力してください。');
      next.settings.partnerName = name; commit(next, `${name}。これからも、よろしく。`);
    } else if (form.id === 'favorites-form') {
      const favorites = data.getAll('favorite'); if (favorites.length > 3) return formError(form, 'お気に入りにできるのは3種目までです。');
      next.settings.favorites = favorites; commit(next, 'いつもの筋トレを更新しました。');
    } else if (form.id === 'set-form') {
      const foodIds = data.getAll('food'); if (!foodIds.length || foodIds.length > 30) return formError(form, '食品を1〜30個選んでください。');
      const name = data.get('name').trim(); if (!name) return formError(form, 'セット名を入力してください。');
      const portions = [...form.querySelectorAll('.set-choice select:enabled')].map(select => Number(select.value));
      const set = { id: form.dataset.id || id(), name, foodIds, ...(portions.some(q => q !== 1) && { portions }) };
      const selected = new Set(foodIds), known = new Set(next.foods.map(f => f.id));
      next.foods.push(...setDraftFoods.get(form).filter(f => selected.has(f.id) && !known.has(f.id)));
      if (form.dataset.id) next.mealSets = next.mealSets.map(s => s.id === set.id ? set : s); else next.mealSets.push(set);
      commit(next, '食事セットを保存しました。');
    }
  } catch (error) { formError(form, error.message); }
});
// 折りたたんだ詳細に入力エラーがある場合も、ブラウザのエラー表示を見える位置へ出す。
document.addEventListener('invalid', event => {
  const details = event.target.closest('#workout-form details, .food-details');
  if (details) details.open = true;
}, true);
// WebKit places the caret on mouseup, after focus has selected the previous set's value.
let enteringQuickField = null;
document.addEventListener('mousedown', event => {
  const input = event.target;
  enteringQuickField = event.button === 0 && input !== document.activeElement && input.matches('.quick-set-form input') ? input : null;
});
document.addEventListener('mouseup', event => {
  if (event.target === enteringQuickField) {
    event.preventDefault();
    enteringQuickField.select();
  }
  enteringQuickField = null;
});
document.addEventListener('focusin', event => {
  if (event.target.matches('.quick-set-form input')) event.target.select();
  if (event.target.id === 'food-search') {
    foodSearchFullHeight = Math.max(innerHeight, window.visualViewport?.height ?? 0);
    toggleFoodResults(true);
    showFoodCandidateAboveKeyboard();
  }
});
document.addEventListener('input', event => {
  if (event.target.closest('#calorie-setup-form, #profile-form')) { updateCaloriePreview(event.target.form); return; }
  if (event.target.matches('.quick-set-form input')) { updateQuickSet(event.target.form); return; }
  if (event.target.closest('#workout-sets-form')) { captureWorkoutDraft(); refreshWorkoutSetDateLabels($('#workout-sets-form'), today()); }
  if (event.target.matches('#workout-sets-form [name=date]')) updateSetGrowthPreview();
  if (event.target.id === 'favorite-search') {
    const ids = new Set(findExercises(event.target.value, '', state).map(ex => ex.id));
    for (const input of $('#favorites-form').elements.favorite) input.closest('label').hidden = !ids.has(input.value);
    $('#favorite-empty').hidden = ids.size > 0;
  }
  if (event.target.matches('#favorites-form [name=favorite]')) updateFavoriteSelection();
  if (event.target.id === 'exercise-search') { exerciseQuery = event.target.value; filterExercises(true); }
  if (event.target.id === 'food-search') { foodQuery = event.target.value; expandedFoods = false; toggleFoodResults(true); updateFoodResults(); showFoodCandidateAboveKeyboard(); }
  if (event.target.closest('#food-form')) updateFoodFormPreview();
  if (event.target.closest('#set-form') && (event.target.id === 'set-search' || event.target.name === 'food')) updateSetChoices();
  const historyKey = {'history-search':'query','history-kind':'kind','history-from':'from','history-to':'to'}[event.target.id];
  if (historyKey) { historyFilters[historyKey] = event.target.value; historyLimit = 30; updateHistory(); }
  if (event.target.closest('#workout-form')) updateWorkoutPreview();
  if (event.target.closest('#workout-sets-form') && event.target.hasAttribute('aria-invalid')) {
    const error = document.getElementById(event.target.getAttribute('aria-describedby'));
    if (error) error.textContent = '';
    event.target.removeAttribute('aria-invalid'); event.target.removeAttribute('aria-describedby');
    event.target.closest('.workout-set-row')?.classList.remove('has-error');
  }
  if (event.target.matches('.preview-range input') && event.target.value !== '') { previewStages[event.target.name].shape = Math.round(clampShape(event.target.value)); updatePreview(); }
});
document.addEventListener('change', async event => {
  if (event.target.id === 'food-category') {
    foodCategory = event.target.value; expandedFoods = false;
    toggleFoodResults(true); updateFoodResults(); return;
  }
  if (event.target.id === 'exercise-custom-only') { customOnly = event.target.checked; filterExercises(true); return; }
  if (event.target.matches('#custom-exercise-form [name=unit]')) {
    const form = event.target.form, seconds = event.target.value === '秒';
    form.querySelector('[data-count-unit]').textContent = event.target.value;
    if (form.elements.count.value === (seconds ? '10' : '30')) form.elements.count.value = seconds ? 30 : 10;
    if (form.elements.sets.value === (seconds ? '3' : '1')) form.elements.sets.value = seconds ? 1 : 3;
    return;
  }
  if (event.target.id === 'exercise-part') { exercisePart = event.target.value; filterExercises(true); return; }
  if (event.target.id === 'notebook-page') { notebookModal(event.target.value); $('#notebook-page')?.focus({ preventScroll:true }); return; }
  if (event.target.id === 'history-exercise') { exerciseHistoryModal(event.target.value); $('#history-exercise').focus({ preventScroll: true }); return; }
  if (event.target.matches('#body-type-form [name=bodyType]')) { updateBodyTypePreview(); return; }
  if (event.target.id !== 'import-file') return;
  const input = event.target, file = input.files[0]; if (!file) return;
  input.disabled = true;
  backupMessage('バックアップを確認しています。', false);
  try {
    const imported = await readBackupFile(file);
    if (!input.isConnected || !$('#modal').open) return;
    const restore = () => {
      imported.settings.dataSafety = dataSafetyAfterRestore(imported.settings.dataSafety, state.settings.dataSafety);
      if (commit(imported, 'バックアップを復元しました。', { allowRecovery: true })) { undoState = null; $('#toast').querySelector('[data-action="undo"]')?.remove(); }
      else { backupMessage($('#toast').textContent || '復元できませんでした。元の記録は変更していません。'); if ($('#modal').open) pendingConfirm = restore; }
    };
    confirmAction('バックアップから復元', `現在の記録・プロフィール・設定を、筋トレ${imported.workouts.length}件・食事${imported.meals.length}件・自作種目${imported.customExercises.length}件のバックアップで置き換えます。必要なら先に現在のデータを書き出してください。聞いたことばと、物語を読んだしおりは、現在のものとまとめて残します。`, restore, '置き換えて復元');
  } catch (error) { if (input.isConnected && $('#modal').open) backupMessage(`復元できませんでした。${error instanceof SyntaxError ? 'JSON形式のファイルを選んでください。' : error.message}`); }
  finally { input.value = ''; input.disabled = false; }
});
$('#modal').addEventListener('click', event => { if (event.target === $('#modal')) { const rect = $('#modal').getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeModal(); } });
$('#modal').addEventListener('cancel', event => {
  const back = event.currentTarget.querySelector('[data-action="history-back"], [data-action="history-delete-back"]');
  if (back) { event.preventDefault(); back.click(); }
});
$('#modal').addEventListener('close', () => {
  if (!$('#modal').open) {
    calendarHistoryDay = null;
    releaseMealPhoto();
    $('#modal .workout-sheet')?.remove();
  }
  pendingConfirm = null;
  if (captureWorkoutDraft()) render();
  observeLivingCharacters(); restoreModalFocus(); rememberCompanionExperience();
});
window.addEventListener('storage', event => {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  const draft = activeEntryForm();
  try {
    const wasProtected = !!storageError, previous = state, raw = localStorage.getItem(STORAGE_KEY); sourceRaw = raw; state = raw ? validateState(JSON.parse(raw)) : emptyState();
    if (!wasProtected && settingsOnlyChange(previous, state)) {
      if (recordReaction && reducedMotion()) stopRecordCelebration();
      // Hearing a line in another tab is not a new workout. Keep the batch
      // receipt/comparison and undo only the record, retaining synced settings.
      if (undoState && !undoWasSettings) undoState = undoRecordWithSettings(undoState, state);
      else { undoState = null; $('#toast').querySelector('[data-action="undo"]')?.remove(); }
      if (!draft && JSON.stringify(previous.settings) !== JSON.stringify(state.settings)) closeModal();
      render();
      return;
    }
    undoState = null; feedback = null; activeParts = []; clearComparison(); storageError = '';
    if (!draft) closeModal();
    render();
    if (draft) {
      if (!checkEditTarget(draft)) return;
      if (wasProtected) {
        const error = draft.querySelector('.form-error'); if (error) error.textContent = '';
        noticeDraftUpdate(draft, '保存データを読み直しました。入力内容は残っています。内容を確認してから保存できます。');
      } else if (!settingsOnlyChange(previous, state)) noticeDraftUpdate(draft, '別の画面の記録を反映しました。入力内容は残っています。重複がないか確認してから保存してください。');
    } else toast('別の画面の変更を反映しました。');
  } catch {
    undoState = null; feedback = null; activeParts = []; clearComparison(); storageError = '別の画面の保存データを読み込めませんでした。設定からバックアップを確認してください。';
    if (!draft) closeModal();
    render();
    if (draft) saveFailure(`${storageError}入力内容は残しています。元の保存データを上書きしません。`);
  }
});
function showRoute() {
  stopRecordCelebration();
  if (tab !== 'food') selectedMealSlot = suggestedMealSlot();
  tab = tabs.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home';
  $('#toast').hidden = toastOrigin !== tab;
  closeModal(); render();
  let destination = $('#main');
  if (tab === 'journey' && journeyDestination) {
    if (journeyDestination === 'comparison') destination = $('#comparison-title');
    else {
      $('[data-journey-section="archive"]').open = true;
      const shelf = $(`[data-journey-section="${journeyDestination}"]`);
      shelf.open = true;
      destination = shelf.querySelector('summary');
    }
    destination.scrollIntoView({block:'start', behavior:'instant'});
  } else window.scrollTo({top:0, behavior:'instant'});
  journeyDestination = null;
  destination.focus({preventScroll:true});
}
window.addEventListener('hashchange', showRoute);
function refreshDate() {
  if (today() === lastDate) return;
  const digestOpen = $('#modal').open && !!$('#modal .weekly-digest');
  const conversationOpen = $('#modal').open && !!$('#modal .companion-conversation');
  const partOpen = $('#modal').open && !!$('#modal .part-detail') && activePartDetail;
  const notebookPage = $('#modal[open] [data-notebook-page]')?.dataset.notebookPage;
  const pagePickerFocused = document.activeElement?.id === 'notebook-page';
  const focusAction = document.activeElement?.dataset.action;
  lastDate = today(); selectedMealSlot = suggestedMealSlot(); feedback = null; undoState = null; activeParts = []; clearComparison(); render();
  if ($('#modal[open] .workout-sheet')) workoutSheet();
  else if ($('#modal').open && $('#meal-reuse-form')) { closeModal(); toast('日付が変わりました。記録する食事を選んでください。'); }
  else if (digestOpen) weeklyDigestModal(['weekly-digest-week', 'weekly-digest-turn'].includes(focusAction) ? focusAction : '');
  else if (conversationOpen) {
    openModal('相棒と話す', '', conversationContent(state, companionConversation(state, lastDate, { offset: conversationOffset })));
    if (focusAction === 'companion-talk-next') $('#modal [data-action="companion-talk-next"]')?.focus({ preventScroll: true });
  }
  else if (partOpen) partModal(activePartDetail, false, true);
  else if (notebookPage) {
    if (!currentNotebook().length) closeModal();
    else {
      notebookModal(notebookPage);
      if (pagePickerFocused) $('#notebook-page')?.focus({ preventScroll:true });
    }
  }
  else if ($('#modal').open) {
    refreshDateInputs($('#modal'), lastDate);
    if ($('#workout-form')) updateWorkoutPreview();
    for (const time of $('#modal').querySelectorAll('#history-results time[datetime]')) {
      const label = time.querySelector('span'); if (label) label.textContent = labelDate(time.dateTime);
      for (const date of time.closest('.history-day').querySelectorAll('.record-date')) date.textContent = labelDate(time.dateTime);
    }
  }
}
window.addEventListener('focus', () => { refreshDate(); refreshSceneTime(); });
document.addEventListener('visibilitychange', () => { document.documentElement.classList.toggle('page-hidden', document.hidden); if (document.visibilityState === 'visible') { refreshDate(); refreshSceneTime(); observeLivingCharacters(); rememberCompanionExperience(); } else stopRecordCelebration(true); });
motionPreference.addEventListener('change', () => { stopRecordCelebration(); if (tab === 'home') render(); });
window.addEventListener('pagehide', () => stopRecordCelebration());
window.addEventListener('resize', () => stopRecordCelebration(true));
window.addEventListener('scroll', () => {
  if (arrivalPlayer.isPlaying()) arrivalPlayer.cancel();
  if (recordReaction && (Math.abs(window.scrollX - recordReaction.scrollX) > 1 || Math.abs(window.scrollY - recordReaction.scrollY) > 1)) stopRecordCelebration(true);
}, { passive: true });
let hearingFrame = null;
function checkVisibleSpeech() {
  if (hearingFrame !== null) return;
  hearingFrame = requestAnimationFrame(() => { hearingFrame = null; rememberCompanionExperience(); });
}
window.addEventListener('scroll', checkVisibleSpeech, { passive: true });
window.addEventListener('resize', checkVisibleSpeech);
setInterval(() => { refreshDate(); refreshSceneTime(); maybeBackupReminder(); }, 30000);
setTimeout(maybeBackupReminder, 1800);
watchOffline(() => { const el = $('#offline-settings'); if (el) el.innerHTML = offlineMarkup(); });
restTimer = createRestTimer({ onFinish: () => sound() });
render();
