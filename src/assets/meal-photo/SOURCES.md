# 食事写真の推論用ファイル

- `foodseg103.onnx` は magnusdtd 公開の `yolov8_foodseg103.onnx` の未変更コピー。リビジョンは `cd5730d1f55638b304a9ec249931301e069d3f88`。配布ページには Apache-2.0、ONNX 内の Ultralytics のメタデータには AGPL-3.0 と記載されている。学習済み重み・ネットワーク定義・クラス名はモデルに含まれる。[モデル配布元](https://huggingface.co/magnusdtd/yolov8-foodseg103/tree/cd5730d1f55638b304a9ec249931301e069d3f88) ／ [Ultralytics](https://github.com/ultralytics/ultralytics)
- 推論は Microsoft の ONNX Runtime Web 1.22.0（MIT）を使用。`ort.wasm.min.mjs` と `ort-wasm-simd-threaded.mjs` は静的サーバー用に拡張子を `.js` に変更。WASM と両モジュールの中身は npm 配布版のまま。ライセンスと第三者表示を同梱。[パッケージ](https://www.npmjs.com/package/onnxruntime-web/v/1.22.0) ／ [ソース](https://github.com/microsoft/onnxruntime/tree/v1.22.0)
- 一般食品の値は文部科学省「日本食品標準成分表（八訂）増補2023年」から引用。`src/meal-photo-foods.js` に食品番号と分量換算した値を掲載する。[出典](https://www.mext.go.jp/a_menu/syokuhinseibun/mext_00001.html)
