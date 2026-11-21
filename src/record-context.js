import { clone } from './model.js';
import { mergeCollections } from './collection.js';

// 記録と定番食品等はそのままで、設定や聞いたことばだけを変えた場合。
export function settingsOnlyChange(before, after) {
  return Object.keys(before).filter(key => !['settings','collection'].includes(key)).every(key => JSON.stringify(before[key]) === JSON.stringify(after[key]))
    && Object.keys(after).every(key => ['settings','collection'].includes(key) || key in before);
}

// 記録後に選んだ背景等を巻き戻さず、記録操作だけを取り消す。
export function undoRecordWithSettings(beforeRecord, current) {
  return { ...clone(beforeRecord), settings: clone(current.settings), collection: mergeCollections(current.collection, beforeRecord.collection) };
}
