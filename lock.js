// Child lock, volume lock, break time (YouTube in a native WebView) and the calm-down monitor.
// Core talking stays offline: this file makes no network calls. On Android, only the native break-time WebView uses the network.
(()=>{
const D={lock:false,vollock:false,vollvl:.5,brkmin:15,calmon:false,calmsens:5,calmsus:3,calmcd:2,calmlen:15,calmmusic:true,calmphrase:"Let's take a breath with Pip. Breathe in... and out."};
for(const k in D)if(S.settings[k]===undefined)S.settings[k]=D[k];
if(!S.calm)S.calm={sounds:[]};
const C=window.Capacitor,NATIVE=!!(C&&C.isNativePlatform&&C.isNativePlatform());
const P=NATIVE?(C.registerPlugin?C.registerPlugin('PipLock'):C.Plugins.PipLock):null;window.__native=NATIVE;
window.__player=[];const log=(x)=>{window.__player.push(x);if(window.__player.length>100)window.__player.splice(0,50);};
const call=async(m,a)=>{log(m);if(P)try{return await P[m](a||{});}catch(e){console.warn(m,e);}return null;};

// ---------- child lock ----------
async function applyLock(on){const st=$('#lockinfo');
 if(!NATIVE){if(st)st.textContent='Lock to Pip works in the Android app. In a browser it is off.';return;}
 if(on){const r=await call('startLock');if(st)st.textContent=r&&r.mode==='full'?'Locked (dedicated device): status bar, notifications and settings are blocked.':'Pinned. To leave Pip, use the Parent button here; the Android unpin gesture asks for the phone PIN if you turned that on.';}
 else{await call('stopLock');if(st)st.textContent='Not locked.';}}
async function applyVol(){if(!NATIVE)return;await call('setVolumeLock',{enabled:!!S.settings.vollock,level:+S.settings.vollvl});}
window.lockPanel=function(){const s=S.settings;$('#lockon').checked=s.lock;$('#vollock').checked=s.vollock;$('#vollvl').value=Math.round(s.vollvl*100);$('#vollv').textContent=Math.round(s.vollvl*100)+'%';
 $('#brkmin').value=String(s.brkmin);$('#calmon').checked=s.calmon;$('#calmsens').value=s.calmsens;$('#calmsus').value=String(s.calmsus);$('#calmcd').value=String(s.calmcd);$('#calmlen').value=String(s.calmlen);$('#calmmusic').checked=s.calmmusic;$('#calmphrase').value=s.calmphrase;
 $('#webnote').hidden=NATIVE;renderSounds();if(!NATIVE)$('#lockinfo').textContent='Lock to Pip works in the Android app. In a browser it is off.';};
// Turning the lock OFF only happens here, inside the parent panel (already behind the gate).
$('#lockon').onchange=e=>{S.settings.lock=e.target.checked;save();applyLock(S.settings.lock);};
$('#vollock').onchange=e=>{S.settings.vollock=e.target.checked;save();applyVol();};
$('#vollvl').oninput=e=>{S.settings.vollvl=e.target.value/100;$('#vollv').textContent=e.target.value+'%';save();};$('#vollvl').onchange=()=>applyVol();
[['brkmin',Number],['calmsens',Number],['calmsus',Number],['calmcd',Number],['calmlen',Number]].forEach(([k,f])=>$('#'+k).onchange=e=>{S.settings[k]=f(e.target.value);save();});
$('#calmon').onchange=e=>{S.settings.calmon=e.target.checked;save();};$('#calmmusic').onchange=e=>{S.settings.calmmusic=e.target.checked;save();};
$('#calmphrase').onchange=e=>{S.settings.calmphrase=e.target.value.slice(0,160)||D.calmphrase;save();};
if(S.settings.lock)applyLock(true);if(S.settings.vollock)applyVol();

// ---------- break time ----------
let brk=null;// {end,timer}
window.breakOn=()=>!!brk;
window.startBreak=async function(){if(brk)return;$('#panel').hidden=true;const m=+S.settings.brkmin;brk={end:m?Date.now()+m*60000:0};
 if(S.settings.lock)applyLock(true);
 const b=$('#break');b.hidden=false;b.classList.remove('out');void b.offsetWidth;b.classList.add('in');
 if(NATIVE)await call('openBreak',{url:'https://m.youtube.com/'});else log('webPlaceholder');
 brk.t=setInterval(brkTick,1000);brkTick();monitorStart();};
function brkTick(){if(!brk)return;const left=brk.end?brk.end-Date.now():0;$('#brktime').textContent=brk.end?`Break time: ${Math.max(0,Math.ceil(left/60000))} min left`:'Break time';if(brk.end&&left<=0)stopBreak('timer');}
window.stopBreak=async function(why){if(!brk)return;clearInterval(brk.t);brk=null;monitorStop();hideCalm(true);
 if(NATIVE)await call('closeBreak');const b=$('#break');b.classList.add('out');
 setTimeout(()=>{b.hidden=true;b.classList.remove('in','out');},900);window.__breakEnds=(window.__breakEnds||[]).concat(why||'parent');
 const t=$('#toast');if(t){t.textContent='Break time is over. Pip is here to talk.';t.hidden=false;setTimeout(()=>t.hidden=true,3500);}};
async function parentDuringBreak(){if(!brk)return;await call('pauseVideo');if(NATIVE)await call('hideBreak',{hidden:true});
 if(!openGate(()=>stopBreak('parent')))resumeBreak();}
async function resumeBreak(){if(!brk||calmOn)return;if(NATIVE)await call('hideBreak',{hidden:false});await call('playVideo');}
window.gateFailed=()=>{if(brk)resumeBreak();};
$('#gate [data-close]').addEventListener('click',()=>{if(brk)setTimeout(resumeBreak,0);});
if(P&&P.addListener)P.addListener('breakParent',parentDuringBreak);
// web: a parent hold button on the placeholder
{let t;const pb=$('#brkparent');pb.addEventListener('pointerdown',e=>{e.preventDefault();t=setTimeout(parentDuringBreak,2000);});['pointerup','pointerleave','pointercancel'].forEach(ev=>pb.addEventListener(ev,()=>clearTimeout(t)));}
window.parentDuringBreak=parentDuringBreak;
$('#brkstart').onclick=()=>startBreak();

// ---------- calm-down monitor (features only: no recording, no storage or upload of audio) ----------
const NB=24,FMIN=120,FMAX=5000;let actx=null,an=null,micStream=null,src=null,iv=null,hist=[],lastCalm=0,calmOn=false,frameBuf=null;
function analyser(node){actx=node?node.context:ac();an=actx.createAnalyser();an.fftSize=2048;an.smoothingTimeConstant=.5;const z=actx.createGain();z.gain.value=0;
 (node||src).connect(an);an.connect(z).connect(actx.destination);frameBuf=new Float32Array(an.frequencyBinCount);return an;}
// one feature frame: 24 log-spaced band energies (log power), mean-removed + L2-normalised -> timbre shape independent of loudness; plus loudness.
function frame(){an.getFloatFrequencyData(frameBuf);const sr=actx.sampleRate,bin=sr/an.fftSize,v=new Array(NB).fill(0),cnt=new Array(NB).fill(0);let tot=0;
 for(let i=1;i<frameBuf.length;i++){const f=i*bin;if(f<FMIN||f>FMAX)continue;const b=Math.min(NB-1,Math.floor(NB*Math.log(f/FMIN)/Math.log(FMAX/FMIN)));const p=Math.pow(10,frameBuf[i]/10);v[b]+=p;cnt[b]++;tot+=p;}
 for(let b=0;b<NB;b++)v[b]=Math.log10(1e-12+v[b]/Math.max(1,cnt[b]));const m=v.reduce((a,x)=>a+x,0)/NB;let n=0;for(let b=0;b<NB;b++){v[b]-=m;n+=v[b]*v[b];}n=Math.sqrt(n)||1;
 return {v:v.map(x=>+(x/n).toFixed(3)),db:10*Math.log10(tot+1e-12)};}
const cos=(a,b)=>{let s=0;for(let i=0;i<a.length;i++)s+=a[i]*b[i];return s;};
window.calmScore=(fv)=>{let best=0,who=null;for(const s of S.calm.sounds){if(!s.trigger)continue;for(const t of s.frames){const c=cos(fv,t);if(c>best){best=c;who=s.name;}}}return {best,who};};
const thr=()=>.97-.035*S.settings.calmsens; // sensitivity 1..10 -> similarity threshold .935 .. .62
async function micNode(){micStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:false,autoGainControl:false}});const a=ac();return a.createMediaStreamSource(micStream);}
function micStop(){if(micStream){micStream.getTracks().forEach(t=>t.stop());micStream=null;}try{an&&an.disconnect();}catch(_){}an=null;}
// Teach: parent holds the button while the sound happens; we keep up to 16 feature frames (numbers only).
window.teachSound=async function(name,ms=3000,node){const nd=node||await micNode();analyser(nd);const fr=[];
 await new Promise(r=>{const t0=Date.now();const id=setInterval(()=>{const f=frame();if(f.db>-75)fr.push(f.v);if(Date.now()-t0>=ms||window.__teachStop){clearInterval(id);window.__teachStop=false;r();}},120);});
 if(!node)micStop();else{try{an.disconnect();}catch(_){}}
 if(fr.length<3)return {ok:false,frames:fr.length};const keep=fr.filter((_,i)=>i%Math.ceil(fr.length/16)===0).slice(0,16);
 const ex=S.calm.sounds.find(s=>s.name===name);if(ex)ex.frames=ex.frames.concat(keep).slice(-32);else S.calm.sounds.push({id:Date.now(),name,frames:keep,trigger:true});save();renderSounds();return {ok:true,frames:keep.length};};
window.monitorStart=async function(node){if(!S.settings.calmon||!S.calm.sounds.some(s=>s.trigger))return false;try{const nd=node||(src=await micNode());analyser(nd);}catch(e){return false;}
 hist=[];iv=setInterval(()=>{const f=frame(),loud=f.db>-70,sc=loud?calmScore(f.v):{best:0};hist.push({t:Date.now(),hit:sc.best>=thr(),s:+sc.best.toFixed(3)});
  const N=S.settings.calmsus*1000,now=Date.now();hist=hist.filter(h=>now-h.t<=N+300);window.__calmHist=hist.slice(-10);
  const span=hist.length?now-hist[0].t:0,hits=hist.filter(h=>h.hit).length;
  if(!calmOn&&span>=N-300&&hits/hist.length>=.7&&now-lastCalm>S.settings.calmcd*60000)calmDown(sc.who);},250);return true;};
window.monitorStop=function(){clearInterval(iv);iv=null;micStop();src=null;};
// Calm-down: pause video, soft TTS + optional soft pad, breathing circle, then resume.
let calmT=null;
async function calmDown(who){calmOn=true;lastCalm=Date.now();window.__calms=(window.__calms||[]).concat(who||'?');await call('pauseVideo');if(NATIVE)await call('hideBreak',{hidden:true});
 const c=$('#calm');c.hidden=false;$('#calmtext').textContent=S.settings.calmphrase;c.classList.add('in');
 try{speak(S.settings.calmphrase);}catch(_){}if(S.settings.calmmusic&&S.settings.sound!=='off')pad(Math.min(20,S.settings.calmlen));
 calmT=setTimeout(()=>hideCalm(false),S.settings.calmlen*1000);}
window.calmDown=calmDown;
function hideCalm(silent){clearTimeout(calmT);const c=$('#calm');if(c.hidden){calmOn=false;return;}c.classList.remove('in');setTimeout(()=>{c.hidden=true;},600);calmOn=false;lastCalm=Date.now();if(!silent)resumeBreak();}
function pad(sec){try{const a=ac(),t=a.currentTime+.1;[[196,247,294],[175,220,262]].forEach((ch,j)=>ch.forEach(f=>{const o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.value=f;
 const t0=t+j*sec/2,t1=t0+sec/2;g.gain.setValueAtTime(.0001,t0);g.gain.linearRampToValueAtTime(.035,t0+2);g.gain.setValueAtTime(.035,t1-2);g.gain.linearRampToValueAtTime(.0001,t1);o.connect(g).connect(OUT());o.start(t0);o.stop(t1+.1);}));}catch(_){}}
// ---------- taught-sounds list + teach button ----------
window.renderSounds=renderSounds;function renderSounds(){const L=$('#tsounds');if(!L)return;L.innerHTML=S.calm.sounds.length?'':'<p class="note">No sounds taught yet.</p>';
 S.calm.sounds.forEach(s=>{const r=document.createElement('div');r.className='trow';r.innerHTML=`<label><input type="checkbox" ${s.trigger?'checked':''}> ${esc(s.name)} <small>(${s.frames.length} samples)</small></label><button class="link" type="button">Delete</button>`;
  r.querySelector('input').onchange=e=>{s.trigger=e.target.checked;save();};r.querySelector('button').onclick=()=>{S.calm.sounds=S.calm.sounds.filter(x=>x!==s);save();renderSounds();};L.appendChild(r);});}
{const tb=$('#teach');let busy=false;tb.addEventListener('pointerdown',async e=>{e.preventDefault();if(busy)return;busy=true;window.__teachStop=false;const name=($('#tname').value||'Sound '+(S.calm.sounds.length+1)).slice(0,30);
  tb.textContent='Listening… keep holding';try{const r=await teachSound(name,4000);$('#teachmsg').textContent=r.ok?`Learned “${name}” (${r.frames} samples, numbers only — no audio kept).`:'Too quiet — try again closer to the sound.';}catch(err){$('#teachmsg').textContent='Microphone not available.';}
  tb.textContent='Hold to teach this sound';busy=false;});['pointerup','pointerleave','pointercancel'].forEach(ev=>tb.addEventListener(ev,()=>{window.__teachStop=true;}));}
$('#calmtry').onclick=()=>{$('#panel').hidden=true;calmDown('preview');};
})();
