/* Direct microphone capture: no Web Speech language/session dependency. */
(() => {
  'use strict';
  const scriptBase = new URL('.', document.currentScript.src);
  const SAMPLE_RATE = 16000, MAX_SECONDS = 12;
  let current = null;
  function resample(chunks, inputRate) {
    const length = chunks.reduce((n, c) => n + c.length, 0);
    const input = new Float32Array(length);
    let offset = 0;
    for (const chunk of chunks) { input.set(chunk, offset); offset += chunk.length; }
    const output = new Float32Array(Math.floor(length * SAMPLE_RATE / inputRate));
    for (let i = 0; i < output.length; i++) {
      const position = i * inputRate / SAMPLE_RATE, left = Math.floor(position);
      const fraction = position - left;
      output[i] = input[left] * (1 - fraction) + input[Math.min(left + 1, length - 1)] * fraction;
    }
    return output;
  }
  function releaseAudio(session) {
    clearTimeout(session.limit); clearTimeout(session.inputDeadline);
    if (session.processor) { session.processor.onaudioprocess = null; session.processor.disconnect(); }
    session.source?.disconnect(); session.mute?.disconnect();
    for (const track of session.media?.getTracks() || []) track.stop();
    session.context?.close().catch(() => {});
    session.recording = false;
  }
  function finish(session) {
    if (!session || session.finished || session.cancelled) return;
    session.finished = true;
    releaseAudio(session);
    session.resolveCapture?.();
  }
  async function recognize(status) {
    if (current) throw new Error('A Mongolian recording is already active. Stop it and retry.');
    const session = {recording:false,cancelled:false,finished:false,chunks:[],frames:0};
    current = session;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone recording needs a secure HTTPS browser page.');
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error('This browser cannot record audio for on-device Mongolian search.');
      session.context = new AudioContext();
      // Request/resume audio before awaiting permission or model loading.
      const resumed = session.context.resume();
      status('Requesting Mongolian microphone access...');
      const permission = navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true},video:false});
      permission.then(media => { if (session.cancelled) for (const track of media.getTracks()) track.stop(); }, () => {});
      session.media = await permission;
      if (session.cancelled) return '';
      await resumed;
      if (session.context.state !== 'running') throw new Error('Audio could not start. Tap the microphone again to retry.');
      session.worker = new Worker(new URL('mongolian_voice_worker.js', scriptBase));
      let readyResolve, readyReject, decodedResolve, decodedReject;
      session.ready = new Promise((resolve,reject) => {readyResolve=resolve;readyReject=reject;});
      session.ready.catch(() => {});
      session.worker.onmessage = event => {
        const message = event.data;
        if (message.type === 'ready') readyResolve();
        else if (message.type === 'result') decodedResolve?.(message.text);
        else if (message.type === 'error') {
          const error = new Error(message.message || 'Mongolian processing failed.');
          readyReject(error); decodedReject?.(error);
        }
      };
      session.worker.onerror = () => {
        const error = new Error('The Mongolian voice worker could not run. Retry or type your search.');
        readyReject(error); decodedReject?.(error);
      };
      session.worker.postMessage({type:'init'});
      session.source = session.context.createMediaStreamSource(session.media);
      session.processor = session.context.createScriptProcessor(4096,1,1);
      session.mute = session.context.createGain(); session.mute.gain.value = 0;
      const captured = new Promise((resolve,reject) => {session.resolveCapture=resolve;session.rejectCapture=reject;});
      session.processor.onaudioprocess = event => {
        if (!session.recording || session.finished || session.cancelled) return;
        const input = event.inputBuffer.getChannelData(0);
        const remaining = Math.max(0, Math.floor(session.context.sampleRate * MAX_SECONDS) - session.frames);
        const chunk = new Float32Array(input.subarray(0, remaining));
        session.chunks.push(chunk); session.frames += chunk.length;
        if (chunk.length) clearTimeout(session.inputDeadline);
        if (remaining <= input.length) finish(session);
      };
      for (const track of session.media.getAudioTracks()) track.onended = () => {
        if (session.recording && !session.finished && !session.cancelled) session.rejectCapture(new Error('Microphone recording was interrupted. Retry or type your search.'));
      };
      session.source.connect(session.processor);session.processor.connect(session.mute);session.mute.connect(session.context.destination);
      session.recording = true;
      session.limit = setTimeout(() => finish(session), MAX_SECONDS * 1000);
      session.inputDeadline = setTimeout(() => session.rejectCapture(new Error('No audio reached the app. Check microphone permission and retry.')), 5000);
      status('Listening in Mongolian... Speak now. Tap Search recording when finished. Audio stays on this device.');
      await captured;
      if (session.cancelled) return '';
      if (!session.frames) throw new Error('No microphone audio was captured. Retry or type your search.');
      const samples = resample(session.chunks, session.context.sampleRate);
      session.chunks = [];
      // Do not transcribe silence, which can produce invented Whisper text.
      let energy = 0; for (const sample of samples) energy += sample * sample;
      if (Math.sqrt(energy / Math.max(1,samples.length)) < 0.001) return '';
      status('Recognizing Mongolian on this device... First use may take longer while the voice model loads.');
      await session.ready;
      if (session.cancelled) return '';
      const decoded = new Promise((resolve,reject) => {decodedResolve=resolve;decodedReject=reject;session.resolveDecode=resolve;});
      session.worker.postMessage({type:'decode',samples}, [samples.buffer]);
      return await decoded;
    } catch (error) {
      if (session.cancelled) return '';
      if (error?.name === 'NotAllowedError') throw new Error('Allow microphone access for this website in Safari Settings, then retry or type your search.');
      if (error?.name === 'NotFoundError' || error?.name === 'NotReadableError') throw new Error('The browser could not open the microphone. Stop other recording apps and retry.');
      throw error;
    } finally {
      releaseAudio(session);session.worker?.terminate();
      if (current === session) current = null;
    }
  }
  globalThis.lexiconMongolianVoice = {
    recognize,
    get recording() { return current?.recording || false; },
    finish() { finish(current); },
    cancel() {
      if (!current) return;
      const session = current;session.cancelled=true;
      releaseAudio(session);session.resolveCapture?.();session.resolveDecode?.('');session.worker?.terminate();
      // Settle a pending worker initialization on cancellation too.
      if (session.ready) session.worker?.onmessage?.({data:{type:'ready'}});
      current = null;
    },
  };
})();
