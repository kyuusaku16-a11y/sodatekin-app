import { MESH_WIDTH, MESH_HEIGHT, buildCharacterMesh, partShape, shapeStage } from './character-mesh.js';
import { studioMesh, paintStudio2D } from './studio-character.js';
import { PARTS } from './rules.js';
import { bodyTypeOf } from './body-types.js';
import { cheerArmsMarkup, cheerArmGeometry } from './character-reaction-view.js';
import { livingEnabled, characterLifeMarkup, paintCharacterLife } from './character-life.js';
import { normalizeOutfit, hasOutfit, outfitLabel, outfitLayers, outfitMarkup } from './character-outfit.js';

const vertexSource = `
attribute vec2 aPosition;
attribute vec2 aUV0; attribute vec2 aUV1; attribute vec2 aUV2; attribute vec2 aUV3; attribute vec2 aUV4;
attribute vec3 aState;
varying vec2 vUV0; varying vec2 vUV1; varying vec2 vUV2; varying vec2 vUV3; varying vec2 vUV4;
varying vec3 vState;
void main() {
  gl_Position=vec4(aPosition.x/200.0-1.0,1.0-aPosition.y/276.0,0.0,1.0);
  vUV0=aUV0; vUV1=aUV1; vUV2=aUV2; vUV3=aUV3; vUV4=aUV4; vState=aState;
}`;
const fragmentSource = `
precision mediump float;
uniform sampler2D uAtlas;
varying vec2 vUV0; varying vec2 vUV1; varying vec2 vUV2; varying vec2 vUV3; varying vec2 vUV4;
varying vec3 vState;
void main() {
  if(vState.z<.98) discard;
  float s=vState.x;
  vec4 c=texture2D(uAtlas,vUV0)*max(0.0,1.0-abs(s))
    +texture2D(uAtlas,vUV1)*max(0.0,1.0-abs(s-1.0))
    +texture2D(uAtlas,vUV2)*max(0.0,1.0-abs(s-2.0))
    +texture2D(uAtlas,vUV3)*max(0.0,1.0-abs(s-3.0))
    +texture2D(uAtlas,vUV4)*max(0.0,1.0-abs(s-4.0));
  c.rgb=mix(c.rgb,vec3(1.0,.71,.25)*c.a,vState.y*.20);
  gl_FragColor=c;
}`;
const atlases = new Map(), paintRequests = new WeakMap(), originalLabels = new WeakMap();
let renderer;
let paletteCanvas;
function paintCheerPalette(canvas, atlas, options) {
  const overlay = canvas.parentElement.querySelector('.character-cheer-arms');
  if (!overlay) return;
  paletteCanvas ||= document.createElement('canvas');
  paletteCanvas.width = paletteCanvas.height = 1;
  const context = paletteCanvas.getContext('2d', { willReadFrequently: true });
  const samples = cheerArmGeometry(options.values, options).map(({ sample }) => {
    // The neutral source frame carries the base skin tone; later frames add
    // muscle shadows that must not turn the whole replacement arm dark brown.
    context.clearRect(0, 0, 1, 1);
    context.drawImage(atlas, sample[2] * atlas.naturalWidth, sample[3] * atlas.naturalHeight, 1, 1, 0, 0, 1, 1);
    return [...context.getImageData(0, 0, 1, 1).data];
  });
  const rgb = [0, 1, 2].map(i => Math.round(samples.reduce((sum, sample) => sum + sample[i], 0) / samples.length));
  overlay.style.setProperty('--cheer-skin', `rgb(${rgb.join(' ')})`);
  overlay.style.setProperty('--cheer-shadow', `rgb(${rgb.map(v => Math.round(v * .83)).join(' ')})`);
}
function loadAtlas(type) {
  if (atlases.has(type.id)) return atlases.get(type.id);
  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => { atlases.delete(type.id); reject(new Error('画像を読み込めませんでした。再読み込みしてください。')); };
    img.src = type.atlas;
  });
  atlases.set(type.id, promise); return promise;
}
function createRenderer() {
  const surface = document.createElement('canvas');
  surface.width = MESH_WIDTH * 2; surface.height = MESH_HEIGHT * 2;
  const gl = surface.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true, preserveDrawingBuffer: true });
  if (!gl) return { surface, gl: null };
  const shader = (type, source) => {
    const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  ['aPosition','aUV0','aUV1','aUV2','aUV3','aUV4','aState'].forEach((name, i) => {
    const a = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, i === 6 ? 3 : 2, gl.FLOAT, false, 60, i * 8);
  });
  gl.viewport(0, 0, surface.width, surface.height);
  surface.addEventListener('webglcontextlost', event => { event.preventDefault(); renderer = null; paintCharacters(); });
  return { surface, gl, textures: new Map() };
}
function useAtlas(renderer, type, atlas) {
  const { gl, textures } = renderer;
  if (textures.has(type.id)) { gl.bindTexture(gl.TEXTURE_2D, textures.get(type.id)); return; }
  const texture=gl.createTexture(); textures.set(type.id, texture); gl.bindTexture(gl.TEXTURE_2D, texture);
  // Alpha from the generated PNG is preserved. Premultiplication prevents colored
  // RGB hidden in transparent pixels from bleeding onto the silhouette.
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

export function characterMarkup(parts, { back = false, expression = 'normal', active = [], preview = false, bodyType = 'classic', living = false, outfit = null } = {}) {
  expression = !preview && ['proud', 'rest', 'cheer'].includes(expression) ? expression : 'normal';
  living = livingEnabled({ living, preview, expression });
  outfit = normalizeOutfit(outfit);
  const type=bodyTypeOf(bodyType);
  const values = Object.fromEntries(PARTS.map(p => [p.id, partShape(parts[p.id])]));
  if (type.id === 'studio') {
    // This portrait has its own fixed black outfit and a separate anatomical mesh.
    // The older rig's blink, clothing and arm overlays do not register to it.
    const data = JSON.stringify({ values, back, bodyType }).replaceAll('"', '&quot;');
    const label = `${type.name}・${back ? '後ろ姿' : '正面'}。黒い目隠しとトレーニングウェア。${preview ? '体形の試着。' : ''}${PARTS.map(p => `${p.name}${Math.round(values[p.id])}`).join('、')}`;
    return `<div class="character raster-character studio-character" role="img" aria-label="${label}"><canvas class="character-body" width="800" height="1104" data-character="${data}" aria-hidden="true"></canvas><span class="character-load">相棒を読み込み中…</span></div>`;
  }
  const layers = outfitLayers(values, { bodyType: type.id, back, expression, outfit });
  const label = `${type.name}・${back ? '後ろ姿' : '正面'}の相棒。${preview ? '体形の試着。' : ''}${expression === 'cheer' ? '両腕を曲げてガッツポーズ。' : expression === 'proud' ? 'うれしそうな姿。' : expression === 'rest' ? '休養中。' : ''}${outfitLabel(outfit)}${PARTS.map(p => `${p.name}${Math.round(values[p.id])}`).join('、')}`;
  const data = JSON.stringify({ values, back, active, bodyType:type.id, expression, ...(living ? { living: true } : {}), ...(outfit ? { outfit } : {}) }).replaceAll('"', '&quot;');
  return `<div class="character raster-character${living ? ' is-living' : ''}${hasOutfit(outfit) ? ' is-dressed' : ''}${active.length ? ' celebrating' : ''}${expression === 'cheer' ? ' is-cheering' : expression === 'proud' ? ' is-proud' : expression === 'rest' ? ' is-resting' : ''}" role="img" aria-label="${label}"><canvas class="character-body" width="800" height="1104" data-character="${data}" aria-hidden="true"></canvas>${expression === 'cheer' ? cheerArmsMarkup(values, { bodyType: type.id, back, outfit }) : ''}${outfitMarkup(layers)}${living ? characterLifeMarkup(values, { bodyType: type.id, back, expression, outfitLayers: layers }) : ''}<span class="character-load">相棒を読み込み中…</span>${expression === 'proud' ? '<span class="character-joy" aria-hidden="true"><span>✦</span><span>✧</span></span>' : active.length && expression !== 'cheer' ? '<span class="character-sparkle" aria-hidden="true">✦</span>' : ''}${expression === 'rest' ? '<span class="character-rest" aria-hidden="true">z z</span>' : ''}</div>`;
}

export async function paintCharacters(root = document) {
  const canvases = [...root.querySelectorAll('canvas[data-character]')];
  if (!canvases.length) return;
  await Promise.all(canvases.map(async canvas => {
    const request={};paintRequests.set(canvas,request);
    canvas.parentElement.classList.remove('life-ready', 'outfit-ready');
    if (!originalLabels.has(canvas)) originalLabels.set(canvas, canvas.parentElement.getAttribute('aria-label'));
    try {
      const options = JSON.parse(canvas.dataset.character);
      const type=bodyTypeOf(options.bodyType),atlas=await loadAtlas(type);
      if (!canvas.isConnected || paintRequests.get(canvas)!==request) return;
      renderer ||= createRenderer();
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, canvas.width, canvas.height);
      if (renderer.gl) {
        const { vertices, triangles } = type.id === 'studio' ? studioMesh(options.values, options.back) : buildCharacterMesh(options.values, { ...options, smooth: true });
        const data = new Float32Array(triangles.flatMap(i => vertices[i]));
        const { gl, surface } = renderer;
        useAtlas(renderer,type,atlas);
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
        gl.drawArrays(gl.TRIANGLES, 0, triangles.length);
        context.drawImage(surface, 0, 0);
        if (options.expression === 'cheer') paintCheerPalette(canvas, atlas, options);
        if (options.living) paintCharacterLife(canvas, options);
        canvas.dataset.rendered = 'mesh';
        if (hasOutfit(options.outfit)) canvas.parentElement.classList.add('outfit-ready');
        canvas.parentElement.setAttribute('aria-label', originalLabels.get(canvas));
        canvas.parentElement.querySelector('.character-load').hidden = true;
      } else if (type.id === 'studio') {
        paintStudio2D(context, atlas, options.values, options.back);
        canvas.dataset.rendered = 'mesh';
        canvas.parentElement.querySelector('.character-load').hidden = true;
      } else {
        const k = Math.round(Object.values(options.values).reduce((a, v) => a + shapeStage(v), 0) / 8);
        if(type.id==='classic')context.drawImage(atlas, [154,430,704,977,1252][k] - 139, options.back ? 560 : 0, 278, 552, 122, 0, 556, 1104);
        else context.drawImage(atlas,k*384,(options.back?576:0)+70*.375,384,1430*.375,(400-1024*552/1430),0,1024*552/1430*2,1104);
        canvas.dataset.rendered = 'fallback';
        let label = originalLabels.get(canvas).replace('両腕を曲げてガッツポーズ。', '簡易表示。');
        if (hasOutfit(options.outfit)) label = label.replace(outfitLabel(options.outfit), '服・小物は省略しています。');
        canvas.parentElement.setAttribute('aria-label', label);
        const notice = canvas.parentElement.querySelector('.character-load');
        notice.hidden = false;
        notice.textContent = options.expression === 'cheer' ? '簡易表示：このブラウザでは部位別の変形とポーズを表示できません。' : '簡易表示：このブラウザでは部位別の変形を表示できません。';
        if (hasOutfit(options.outfit)) notice.textContent += '服・小物は省略しています。';
        notice.classList.add('character-error');
      }
    } catch (error) {
      if (!canvas.isConnected || paintRequests.get(canvas)!==request) return;
      const notice = canvas.parentElement.querySelector('.character-load');
      notice.hidden = false;
      notice.textContent = '相棒を表示できませんでした。再読み込みしてください。';
      notice.classList.add('character-error');
      canvas.dataset.rendered = 'error';
      console.error('Character rendering failed:', error);
    }
  }));
}
