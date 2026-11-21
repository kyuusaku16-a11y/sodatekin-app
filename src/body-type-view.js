import { COMPANION_TYPES, bodyTypeOf } from './body-types.js';
import { characterSVG } from './character.js';
import { PARTS } from './rules.js';
const initial=Object.fromEntries(PARTS.map(p=>[p.id,{shape:1}]));
const option=(type,selected)=>`<label class="body-type-option"><input type="radio" name="bodyType" value="${type.id}" ${selected===type.id?'checked':''}><span class="body-type-thumb">${characterSVG(initial,{bodyType:type.id,preview:true})}</span><strong>${type.name}</strong><small>${type.description}</small></label>`;
export function bodyTypeOptions(selected) {
  return `<fieldset class="body-type-options"><legend>好きな姿を選んでください</legend>${COMPANION_TYPES.filter(t=>t.id!=='classic').map(t=>option(t,selected)).join('')}</fieldset><details class="classic-option" ${selected==='classic'?'open':''}><summary>初代の相棒</summary>${option(bodyTypeOf('classic'),selected)}</details>`;
}
export function bodyTypePreview(parts,type,back,hasRecords) {
  return `<div class="body-type-comparison ${hasRecords?'':'single'}">${hasRecords?`<figure><figcaption>はじめの姿</figcaption>${characterSVG(initial,{bodyType:type,back,preview:true})}</figure>`:''}<figure><figcaption>${hasRecords?'いまの記録で育った姿':'選んだ姿'}</figcaption>${characterSVG(parts,{bodyType:type,back,preview:true})}</figure></div><p class="body-type-label">${bodyTypeOf(type).name} · ${back?'後ろ姿':'正面'}</p>`;
}
