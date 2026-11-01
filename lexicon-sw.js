const CACHE = 'lexicon-2602d1df7b4a59d6dc94';
const FILES = [".last_build_id", "assets/AssetManifest.bin", "assets/AssetManifest.bin.json", "assets/assets/book.json", "assets/assets/cover/volume-1.png", "assets/assets/entry_sources.json", "assets/assets/fonts/roboto-bold.ttf", "assets/assets/fonts/roboto-regular.ttf", "assets/assets/lexical_graph.json", "assets/assets/privacy/policy.txt", "assets/assets/terminology.json", "assets/assets/voice_search_hints.json", "assets/FontManifest.json", "assets/fonts/MaterialIcons-Regular.otf", "assets/NOTICES", "assets/packages/record_web/assets/js/record.fixwebmduration.js", "assets/packages/record_web/assets/js/record.worklet.js", "assets/packages/sherpa_onnx_web/assets/sherpa-onnx-asr.js", "assets/packages/sherpa_onnx_web/assets/sherpa-onnx-kws.js", "assets/packages/sherpa_onnx_web/assets/sherpa-onnx-punctuation.js", "assets/packages/sherpa_onnx_web/assets/sherpa-onnx-speaker-diarization.js", "assets/packages/sherpa_onnx_web/assets/sherpa-onnx-speech-enhancement.js", "assets/packages/sherpa_onnx_web/assets/sherpa-onnx-tts.js", "assets/packages/sherpa_onnx_web/assets/sherpa-onnx-vad.js", "assets/packages/sherpa_onnx_web/assets/sherpa-onnx-wasm-web.js", "assets/packages/sherpa_onnx_web/assets/sherpa-onnx-wasm-web.wasm", "assets/shaders/ink_sparkle.frag", "assets/shaders/stretch_effect.frag", "canvaskit/canvaskit.js", "canvaskit/canvaskit.js.symbols", "canvaskit/canvaskit.wasm", "canvaskit/chromium/canvaskit.js", "canvaskit/chromium/canvaskit.js.symbols", "canvaskit/chromium/canvaskit.wasm", "canvaskit/skwasm.js", "canvaskit/skwasm.js.symbols", "canvaskit/skwasm.wasm", "canvaskit/skwasm_heavy.js", "canvaskit/skwasm_heavy.js.symbols", "canvaskit/skwasm_heavy.wasm", "canvaskit/webparagraph/canvaskit.js", "canvaskit/webparagraph/canvaskit.js.symbols", "canvaskit/webparagraph/canvaskit.wasm", "canvaskit/wimp.js", "canvaskit/wimp.js.symbols", "canvaskit/wimp.wasm", "fallback-fonts/notosanssymbols/v43/rP2up3q65FkAtHfwd-eIS2brbDN6gxP34F9jRRCe4W3gfQ8gb_VFRkzrbQ.woff2", "fallback-fonts/NotoSansSymbols-OFL.txt", "fallback-fonts/notosanssymbols2/v24/I_uyMoGduATTei9eI8daxVHDyfisHr71-vrgfE71.woff2", "fallback-fonts/NotoSansSymbols2-OFL.txt", "fallback-fonts/roboto/v32/KFOmCnqEu92Fr1Me4GZLCzYlKw.woff2", "fallback-fonts/Roboto-LICENSE.txt", "favicon.png", "flutter.js", "flutter_bootstrap.js", "icons/Icon-192.png", "icons/Icon-512.png", "icons/Icon-maskable-192.png", "icons/Icon-maskable-512.png", "index.html", "main.dart.js", "manifest.json", "version.json"];
const absolute = path => new URL(path, self.registration.scope).href;
const allowed = new Set(FILES.map(absolute));
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  // Complete the entire dictionary cache before activating this version.
  await cache.addAll(FILES.map(path => new Request(absolute(path), {cache:'reload'})));
  await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const name of await caches.keys()) {
    if (name.startsWith('lexicon-') && name !== CACHE) await caches.delete(name);
  }
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // Never intercept provider requests or store audio, notes or translations.
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(async () =>
      (await caches.open(CACHE)).match(absolute('index.html'))));
  } else if (allowed.has(url.href)) {
    event.respondWith((async () =>
      (await (await caches.open(CACHE)).match(event.request)) || fetch(event.request))());
  }
});
