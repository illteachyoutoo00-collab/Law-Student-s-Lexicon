/* Local audio capture. Diagnostics contain counters/energy, never audio. */
(() => {
  'use strict';
  const base = new URL('.', document.currentScript.src);
  const RATE=16000, MAX=12, PAUSE=1.3, MIN_VOICE=.18, THRESHOLD=.004;
  let current=null, armed=null, last={phase:'idle'};
  const now=()=>Date.now();
  function prepare() {
    if (armed) { clearTimeout(armed.timer); armed.context.close().catch(()=>{}); }
    const AC=window.AudioContext||window.webkitAudioContext;
    if (!AC) return;
    const a={context:new AC()};
    a.resumed=a.context.resume(); a.resumed.catch(()=>{});
    a.timer=setTimeout(()=>{if(armed===a){armed=null;a.context.close().catch(()=>{});}},30000);
    armed=a;
  }
  function diagnostics(s) {
    return {phase:s.phase,contextState:s.context?.state||'not-created',trackState:s.track?.readyState||'unknown',trackMuted:!!s.track?.muted,sampleRate:s.rate||0,callbacks:s.callbacks,frames:s.frames,rms:s.rms,peak:s.peak,voicedSeconds:s.voiced,silenceSeconds:s.silence,stopReason:s.reason||null};
  }
  function release(s) {
    clearTimeout(s.limit);clearTimeout(s.frameDeadline);
    if(s.processor){s.processor.onaudioprocess=null;s.processor.disconnect();}
    s.source?.disconnect();s.mute?.disconnect();
    if(s.context)s.context.onstatechange=null;
    for(const t of s.media?.getTracks()||[]){t.onended=null;t.onmute=null;t.onunmute=null;t.stop();}
    s.context?.close().catch(()=>{});s.recording=false;
  }
  function finish(s,reason) {
    if(!s||s.finished||s.cancelled)return;
    s.finished=true;s.reason=reason;release(s);s.resolveCapture?.();
  }
  function fail(s,message) {
    if(s.cancelled||s.finished)return;
    s.reason=message;s.rejectCapture?.(new Error(message));
  }
  async function bounded(s,p,ms,message) {
    let timer;
    try{return await Promise.race([p,s.cancelledPromise.then(()=>{throw new Error('cancelled');}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(message)),ms);})]);}
    finally{clearTimeout(timer);}
  }
  function resample(chunks,rate) {
    const input=new Float32Array(chunks.reduce((n,c)=>n+c.length,0));let at=0;
    for(const c of chunks){input.set(c,at);at+=c.length;}
    const out=new Float32Array(Math.floor(input.length*RATE/rate));
    for(let i=0;i<out.length;i++){const p=i*rate/RATE,l=Math.floor(p),f=p-l;out[i]=input[l]*(1-f)+input[Math.min(l+1,input.length-1)]*f;}
    return out;
  }
  async function recognize(status) {
    if(current)throw new Error('A Mongolian recording is already active. Stop it and retry.');
    const s={phase:'starting',recording:false,cancelled:false,finished:false,closed:false,chunks:[],callbacks:0,frames:0,voiced:0,silence:0,rms:0,peak:0};
    s.cancelledPromise=new Promise(resolve=>s.resolveCancel=resolve);current=s;
    try {
      if(!navigator.mediaDevices?.getUserMedia)throw new Error('Microphone recording requires a secure HTTPS browser page.');
      if(!armed)prepare();
      if(!armed)throw new Error('This browser does not support on-device audio capture. Type your search.');
      const a=armed;armed=null;clearTimeout(a.timer);s.context=a.context;
      status('Requesting Mongolian microphone access...');
      const permission=navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true},video:false});
      permission.then(media=>{if(s.cancelled||s.closed)for(const t of media.getTracks())t.stop();},()=>{});
      s.media=await bounded(s,permission,20000,'Microphone permission did not complete. Allow access and tap the microphone again.');
      await bounded(s,a.resumed,4000,'Audio is suspended. Tap the microphone again, or type your search.');
      if(s.context.state!=='running')throw new Error('Audio is not running. Tap the microphone again, or type your search.');
      s.rate=s.context.sampleRate;
      if(!Number.isFinite(s.rate)||s.rate<8000||s.rate>192000)throw new Error('The browser returned an unsupported microphone sample rate.');
      s.track=s.media.getAudioTracks()[0];
      if(!s.track||s.track.readyState==='ended')throw new Error('No live microphone track is available. Retry or type your search.');
      const captured=new Promise((resolve,reject)=>{s.resolveCapture=resolve;s.rejectCapture=reject;});captured.catch(()=>{});
      s.worker=new Worker(new URL('mongolian_voice_worker.js',base));
      let readyResolve,readyReject,decodeResolve,decodeReject;
      const ready=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject;});ready.catch(()=>{});
      s.worker.onmessage=event=>{
        const m=event.data;
        if(m.type==='ready')readyResolve();
        else if(m.type==='result')decodeResolve?.(m.text);
        else if(m.type==='error'){const e=new Error(m.message||'Mongolian voice model failed.');readyReject(e);decodeReject?.(e);fail(s,e.message);}
      };
      s.worker.onerror=()=>{const e=new Error('Mongolian voice processing could not start. Retry or type your search.');readyReject(e);decodeReject?.(e);fail(s,e.message);};
      s.worker.postMessage({type:'init'});
      s.source=s.context.createMediaStreamSource(s.media);
      s.processor=s.context.createScriptProcessor(4096,1,1);s.mute=s.context.createGain();s.mute.gain.value=0;
      const watchFrames=()=>{clearTimeout(s.frameDeadline);s.frameDeadline=setTimeout(()=>fail(s,s.frames?'Microphone audio stopped reaching the app. Retry or type your search.':'No audio frames reached the app. Check microphone access and retry.'),4000);};
      s.processor.onaudioprocess=event=>{
        if(!s.recording||s.finished||s.cancelled)return;
        const input=event.inputBuffer.getChannelData(0),remaining=Math.max(0,Math.floor(s.rate*MAX)-s.frames);
        const chunk=new Float32Array(input.subarray(0,remaining));if(!chunk.length)return;
        let energy=0,peak=0;for(const v of chunk){if(!Number.isFinite(v)){fail(s,'The microphone returned invalid audio samples.');return;}energy+=v*v;peak=Math.max(peak,Math.abs(v));}
        s.chunks.push(chunk);s.callbacks++;s.frames+=chunk.length;s.rms=Math.sqrt(energy/chunk.length);s.peak=Math.max(s.peak,peak);watchFrames();
        if(s.callbacks===1){s.phase='listening';status('Listening in Mongolian... Speak, then pause. Recording finishes automatically.');}
        const seconds=chunk.length/s.rate;
        if(s.rms>=THRESHOLD){s.voiced+=seconds;s.silence=0;}else{s.silence+=seconds;}
        if(s.voiced>=MIN_VOICE&&s.silence>=PAUSE)finish(s,'pause');
        else if(s.voiced<MIN_VOICE&&s.frames/s.rate>=6)finish(s,'no-speech');
        else if(remaining<=input.length)finish(s,'maximum-duration');
      };
      s.track.onended=()=>fail(s,'The microphone was disconnected or interrupted. Retry or type your search.');
      s.context.onstatechange=()=>{if(s.recording&&s.context.state!=='running')fail(s,'Audio was suspended or interrupted. Tap the microphone again to retry.');};
      s.source.connect(s.processor);s.processor.connect(s.mute);s.mute.connect(s.context.destination);
      s.recording=true;s.phase='waiting-for-audio';watchFrames();
      s.limit=setTimeout(()=>finish(s,'maximum-duration'),MAX*1000);
      status('Starting microphone... Waiting for audio from the browser.');
      await bounded(s,captured,14000,'Recording did not finish. Retry or type your search.');
      if(!s.frames)throw new Error('No microphone audio was captured. Retry or type your search.');
      if(s.voiced<MIN_VOICE){s.phase='no-speech';return '';}
      const samples=resample(s.chunks,s.rate);s.chunks=[];
      s.phase='loading-model';status('Processing recorded audio on this device... The voice model may take longer to load on first use.');
      await bounded(s,ready,60000,'Mongolian voice model did not load in time. Connect to the internet and retry, or type your search.');
      s.phase='transcribing';status('Recognizing Mongolian on this device...');
      const decoded=new Promise((resolve,reject)=>{decodeResolve=resolve;decodeReject=reject;});
      s.worker.postMessage({type:'decode',samples},[samples.buffer]);
      const text=await bounded(s,decoded,45000,'Mongolian recognition took too long. Try a shorter phrase or type your search.');
      s.phase='complete';return text;
    } catch(error) {
      if(s.cancelled){s.phase='cancelled';return '';}
      s.phase='error';s.reason=error.message;
      if(error?.name==='NotAllowedError')throw new Error('Allow microphone access for this website in Safari Settings, then retry or type your search.');
      if(error?.name==='NotFoundError'||error?.name==='NotReadableError')throw new Error('The browser could not open the microphone. Stop other recording apps and retry.');
      throw error;
    } finally {s.closed=true;last=diagnostics(s);release(s);s.chunks=[];s.worker?.terminate();if(current===s)current=null;}
  }
  globalThis.lexiconMongolianVoice={prepare,recognize,get recording(){return current?.recording||false;},get diagnostics(){return current?diagnostics(current):{...last};},finish(){finish(current,'manual');},cancel(){
    if(armed){clearTimeout(armed.timer);armed.context.close().catch(()=>{});armed=null;}
    if(!current)return;const s=current;s.cancelled=true;s.resolveCancel();release(s);s.worker?.terminate();current=null;
  }};
})();
