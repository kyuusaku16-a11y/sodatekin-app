import { continuedDates, firstRecordOn } from './diet-summary.js';
import { today } from './model.js';
import { SCENES, TITLE_BADGE } from './cosmetics.js';
import { DAY_MILESTONES } from './journey.js';

// 取得フラグを保存しない。訂正・復元後も、現在の実施日から導出する。
export function milestonesOf(state, date = today()) {
  const dates = continuedDates(state, date);
  const days = dates.length;
  const first = days >= 14 ? firstRecordOn(state, dates[0]) : null;
  const rewards = [
    { days: 7, title: 'ふたりの称号', detail: `「${TITLE_BADGE}」を、相棒の名前のそばに。` },
    { days: 14, title: 'はじまりの話', detail: '相棒が、最初の一歩を振り返ります。' },
    { days: 30, title: 'いつもの場所に、新しい光', detail: '「朝の光」「夕暮れ」の背景を選べます。' },
  ].map(r => ({ ...r, earned: days >= r.days, date: dates[r.days - 1] || null }));
  const requested = SCENES.find(s => s.id === state.settings.scene) || SCENES[0];
  return {
    days, rewards, next: rewards.find(r => !r.earned) || null,
    nextMemory: DAY_MILESTONES.find(n => n > days) || null,
    scene: days >= requested.days ? requested.id : SCENES[0].id,
    requestedScene: requested.id,
    titleVisible: days >= 7 && state.settings.titleBadge === true,
    arrivalLine: days >= 14 ? `一緒に続けて14日。最初は${Number(first.date.slice(5, 7))}/${Number(first.date.slice(8))}の${first.label}だったな。あの一歩、覚えてるぞ。` : null,
    conversation: days >= 14 ? `最初は${first.date.slice(0, 4)}年${Number(first.date.slice(5, 7))}月${Number(first.date.slice(8))}日の${first.label}だったな。あの一歩から、一緒に続けた日が14日に。間に休みがあっても、おれたちの積み重ねだ。` : null,
  };
}

export function newlyEarnedRewards(previousDays, milestones) {
  const rewards = milestones.rewards.filter(r => r.earned && previousDays < r.days);
  if (previousDays < 100 && milestones.days >= 100) rewards.push({ days: 100, title: '新色のウェア' });
  return rewards;
}
