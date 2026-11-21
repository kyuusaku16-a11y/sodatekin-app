import { InferenceSession, Tensor, env } from './assets/meal-photo/ort.wasm.min.js';
import { PHOTO_SIZE, photoCandidates } from './meal-photo.js';

const asset = name => new URL('./assets/meal-photo/' + name, import.meta.url).href;
env.wasm.numThreads = 1;
env.wasm.wasmPaths = { mjs: asset('ort-wasm-simd-threaded.js'), wasm: asset('ort-wasm-simd-threaded.wasm') };
self.onmessage = async ({ data }) => {
  try {
    const session = await InferenceSession.create(asset('foodseg103.onnx'), { executionProviders: ['wasm'] });
    const pixels = PHOTO_SIZE * PHOTO_SIZE;
    const rgb = new Float32Array(pixels * 3);
    for (let i = 0; i < pixels; i++) {
      rgb[i] = data[i * 4] / 255;
      rgb[pixels + i] = data[i * 4 + 1] / 255;
      rgb[2 * pixels + i] = data[i * 4 + 2] / 255;
    }
    const input = new Tensor('float32', rgb, [1, 3, PHOTO_SIZE, PHOTO_SIZE]);
    const { output0 } = await session.run({ [session.inputNames[0]]: input }, ['output0']);
    self.postMessage({ items: photoCandidates(output0.data, output0.dims) });
  } catch {
    self.postMessage({ error: '写真を解析できませんでした。通信がある場所でもう一度試すか、食品を選んでください。' });
  }
};
