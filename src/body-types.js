export const BODY_TYPES = Object.freeze([
  { id:'slim', name:'細身', description:'すっきりした輪郭', atlas:'./src/assets/character/body-types-v1/slim-atlas-v1.webp' },
  { id:'natural', name:'自然体', description:'自然な厚み', atlas:'./src/assets/character/body-types-v1/natural-atlas-v1.webp' },
  { id:'round', name:'丸みのある体型', description:'丸みのある輪郭', atlas:'./src/assets/character/body-types-v1/round-atlas-v1.webp' },
  { id:'classic', name:'初代の相棒', description:'これまでの相棒の姿', atlas:'./src/assets/character/growth-atlas-v1.png' },
]);
export const COMPANION_TYPES = Object.freeze([
  { id: 'studio', name: 'スタジオの相棒', description: '黒い目隠しと結い髪', atlas: './src/assets/character/studio-atlas.webp' },
  ...BODY_TYPES,
]);
export const bodyTypeOf = id => COMPANION_TYPES.find(t=>t.id===id) || BODY_TYPES.at(-1);
export const validBodyType = id => COMPANION_TYPES.some(t=>t.id===id);
