/* Single-threaded WASM works without SharedArrayBuffer or special HTTP headers. */
'use strict';
var module = {};
let engine, ready;
const names = ['tiny-encoder.fp32.onnx','tiny-decoder.int8.onnx','tiny-tokens.hex.txt'];
async function initialize() {
  const assets = new URL('assets/packages/sherpa_onnx_web/assets/', self.location.href);
  importScripts(new URL('sherpa-onnx-wasm-web.js', assets).href, new URL('sherpa-onnx-asr.js', assets).href);
  const wasmResponse = await fetch(new URL('sherpa-onnx-wasm-web.wasm', assets));
  if (!wasmResponse.ok) throw new Error('Mongolian speech runtime could not load. Connect to the internet once and retry.');
  const runtime = await SherpaOnnx({wasmBinary:await wasmResponse.arrayBuffer()});
  for (const name of names) {
    const response = await fetch(new URL('assets/assets/asr/'+name,self.location.href));
    if (!response.ok) throw new Error('Mongolian voice model could not load. Connect to the internet once and retry.');
    runtime.FS.writeFile('/'+name,new Uint8Array(await response.arrayBuffer()));
  }
  const recognizer = new OfflineRecognizer({modelConfig:{whisper:{encoder:'/'+names[0],decoder:'/'+names[1],language:'mn',task:'transcribe'},tokens:'/'+names[2],numThreads:1,debug:0,provider:'cpu',modelType:'whisper'}},runtime);
  if (!recognizer.handle) throw new Error('The Mongolian voice model could not start in this browser.');
  return {runtime,recognizer};
}
self.onmessage = async event => {
  try {
    if (event.data.type === 'init') {
      ready = initialize();engine = await ready;self.postMessage({type:'ready'});
    } else if (event.data.type === 'decode') {
      engine = await ready;
      const input = event.data.samples;
      const padded = new Float32Array(Math.max(input.length,16000*20));padded.set(input);
      const stream = engine.recognizer.createStream();
      try {
        stream.acceptWaveform(16000,padded);engine.recognizer.decode(stream);
        const hex = engine.recognizer.getResult(stream).text;
        if (hex && !/^(?:[0-9a-fA-F]{2})+$/.test(hex)) throw new Error('Mongolian recognition returned invalid text. Please retry.');
        const bytes = Uint8Array.from(hex.match(/../g) || [],x=>parseInt(x,16));
        const text = new TextDecoder('utf-8',{fatal:true}).decode(bytes);
        self.postMessage({type:'result',text});
      } finally {stream.free();}
    }
  } catch (error) {self.postMessage({type:'error',message:error.message || 'Mongolian voice processing failed. Retry or type your search.'});}
};
