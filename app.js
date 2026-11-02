'use strict';
// Core vocabulary: positions are FIXED forever (motor planning). Never reorder; only append.
const C={p:'--pron',v:'--verb',a:'--adj',n:'--neg',s:'--soc',q:'--q',r:'--prep'};
const CORE=[
['I','i','p'],['you','you','p'],['want','want','v'],['more','more','a'],['stop','stop','n'],['go','go','v'],
['yes','yes','s'],['no','no','n'],['help','help','v'],['eat','eat','v'],['drink','drink','v'],['play','play','v'],
['like','like','v'],['not','not','n'],['all done','alldone','n'],['again','again','a'],['me','me','p'],['it','it','p'],
['that','that','p'],['here','here','r'],['open','open','v'],['give','give','v'],['look','look','v'],['come','come','v'],
['big','big','a'],['little','little','a'],['up','up','r'],['down','down','r'],['in','in','r'],['out','out','r'],
['on','on','r'],['off','off','r'],['happy','happy','a'],['sad','sad','a'],['hurt','hurt','a'],['tired','tired','a'],
['good','good','a'],['bad','bad','a'],['hot','hot','a'],['cold','cold','a'],['what','what','q'],['where','where','q'],
['who','who','q'],['now','now','q'],['please','please','s'],['thank you','thanks','s'],['bathroom','bathroom','s'],['hug','hug','s']];
const KEY='aac.v1';const MAXS=60;const MAXR=60;
const DEF={settings:{voice:'',rate:0.9,pitch:1,intensity:'calm',sound:'on',speakword:true,mic:false,micsens:5,model:'',fx:'bounce',fxlvl:'low',haptic:false,tapsound:'off',growth:'slow',growcap:'medium',stickgoal:10,lvlsticker:true,slen:'1',autolvl:false,lvlgoal:20,lvlcount:0,lvlsuggest:false},
 mine:[],stats:{words:{},days:{},messages:0,tries:0},coll:{n:0,stickers:[],stars:{},anims:['round']},sentence:[]};
let S;try{S=Object.assign(structuredClone(DEF),JSON.parse(localStorage.getItem(KEY)||'{}'));S.settings=Object.assign({},DEF.settings,S.settings);S.coll=Object.assign(structuredClone(DEF.coll),S.coll||{});}catch(e){S=structuredClone(DEF);}
const IMG={};let db;
function idb(){return db||(db=new Promise((res,rej)=>{const r=indexedDB.open('aac-img',1);r.onupgradeneeded=()=>r.result.createObjectStore('img');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}));}
async function imgPut(id,data){const d=await idb();return new Promise((res,rej)=>{const t=d.transaction('img','readwrite');t.objectStore('img').put(data,String(id));t.oncomplete=res;t.onerror=t.onabort=()=>rej(t.error);});}
async function imgDel(id){const d=await idb();d.transaction('img','readwrite').objectStore('img').delete(String(id));}
async function imgLoadAll(){const d=await idb();return new Promise(res=>{const t=d.transaction('img');const st=t.objectStore('img');const rq=st.openCursor();rq.onsuccess=()=>{const c=rq.result;if(c){IMG[c.key]=c.value;c.continue();}else res();};rq.onerror=()=>res();});}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){alert('Storage is full. Try smaller photos or remove a word.');}};
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let tab='core';
// ---------- speech ----------
const TTS=window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.TextToSpeech;
window.__spoken=[];
async function speak(text){
  if(!text)return;window.__spoken.push(text);if(window.__spoken.length>50)window.__spoken.splice(0,25);const st=S.settings;
  try{
    if(TTS){try{await TTS.stop();}catch(_){} await TTS.speak({text,lang:'en-US',rate:st.rate,pitch:st.pitch,volume:1,category:'playback',voice:st.voice===''?undefined:+st.voice});return;}
    if('speechSynthesis' in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.rate=st.rate;u.pitch=st.pitch;
      const v=speechSynthesis.getVoices();if(st.voice!==''&&v[+st.voice])u.voice=v[+st.voice];
      await new Promise(r=>{u.onend=r;u.onerror=r;speechSynthesis.speak(u);setTimeout(r,8000);});}
  }catch(e){console.warn('tts',e);}
}
async function voices(){try{if(TTS)return(await TTS.getSupportedVoices()).voices.map(v=>v.name);
 if('speechSynthesis' in window)return speechSynthesis.getVoices().map(v=>v.name+' ('+v.lang+')');}catch(e){}return[];}
// ---------- stats ----------
function track(word,isMsg){if(S.settings.model)return;const d=new Date().toISOString().slice(0,10);
 if(word)S.stats.words[word]=(S.stats.words[word]||0)+1;
 S.stats.days[d]=S.stats.days[d]||{w:0,m:0};if(word)S.stats.days[d].w++;if(isMsg){S.stats.days[d].m++;S.stats.messages++;}}
// ---------- grid ----------
function btnHTML(w){return (w.img?`<img src="${w.img}" alt="" loading="lazy" decoding="async">`:icon(w.ic))+`<span>${esc(w.label)}</span>`;}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function words(){return tab==='core'?CORE.map(([label,ic,c])=>({label,ic,c:C[c]})):S.mine.map(m=>({label:m.label,img:IMG[m.id]||null,c:'--acc',id:m.id}));}
function render(){
  const g=$('#grid');g.innerHTML='';g.classList.toggle('mine',tab==='mine');const ws=words();
  ws.forEach((w,i)=>{const b=document.createElement('button');b.className='w';b.style.setProperty('--c',`var(${w.c})`);
    b.innerHTML=btnHTML(w);b.dataset.label=w.label;b.onclick=e=>tapWord(w,e);g.appendChild(b);});
  if(tab==='mine'&&!ws.length){g.innerHTML='<div class="w empty" style="grid-column:1/-1">No personal words yet. A grown-up can add photos in Parent → My words.</div>';}
  $$('#tabs [data-tab]').forEach(t=>t.classList.toggle('on',t.dataset.tab===tab));
  showModel();renderStrip();
}
function renderStrip(){$('#sentence').innerHTML=S.sentence.map(w=>`<div class="chip">${w.id&&IMG[w.id]?`<img src="${IMG[w.id]}">`:icon(w.ic||'it')}<span>${esc(w.label)}</span></div>`).join('');
 const s=$('#sentence');s.scrollLeft=s.scrollWidth;}
const LVLS=['1','2','3','full'];function cap(){const v=S.settings.slen;return v==='full'?MAXS:(+v||1);}
function tapWord(w,e){const c=cap();if(S.settings.slen==='full'){if(S.sentence.length>=MAXS)S.sentence.shift();}else if(S.sentence.length>=c)S.sentence=S.sentence.slice(0,c-1);/* full strip: replace last word, never block */S.sentence.push({label:w.label,ic:w.ic,id:w.id});track(w.label,false);save();renderStrip();
 if(S.settings.speakword)speak(w.label);reward('small',e);if(S.settings.model&&S.settings.model.toLowerCase()===w.label.toLowerCase()){/*keep highlight*/}}
let lastSpeak=0;$('#speak').onclick=async()=>{const t=S.sentence.map(w=>w.label).join(' ');if(!t)return;const now=Date.now();if(now-lastSpeak<700)return;lastSpeak=now;track(null,true);levelTick();success(true);save();await speak(t);};
// ---------- sentence-length levels: only counts up; a parent accepts level-ups behind the gate; never lowers automatically ----------
function levelTick(){const st=S.settings;if(!st.autolvl||st.slen==='full'||st.lvlsuggest)return;if(S.sentence.length>=cap())st.lvlcount++;if(st.lvlcount>=st.lvlgoal)st.lvlsuggest=true;showLvlCard();}
function nextLvl(){return LVLS[Math.min(LVLS.indexOf(S.settings.slen)+1,3)];}const LNAME={'1':'1 word','2':'2 words','3':'3 words','full':'Full sentence'};
function showLvlCard(){const st=S.settings,on=st.autolvl&&st.lvlsuggest&&st.slen!=='full';$('#lvlcard').hidden=!on;if(on)$('#lvlcard').textContent=`Ready for ${LNAME[nextLvl()]}? Grown-up: tap to review`;
 const b=$('#lvlsug');if(b){b.hidden=!on;$('#lvlsugt').textContent=on?`Your child has spoken ${st.lvlcount} times at ${LNAME[st.slen]}. Move up to ${LNAME[nextLvl()]}?`:'';}
 if($('#lvlprog'))$('#lvlprog').textContent=st.slen==='full'?'Full sentence: no level-up needed.':`Spoken at this level: ${Math.min(st.lvlcount,st.lvlgoal)} / ${st.lvlgoal}`+(st.autolvl?'':' (level up automatically is off)');}
$('#lvlcard').onclick=()=>openGate();
function setLvl(v){S.settings.slen=v;S.settings.lvlcount=0;S.settings.lvlsuggest=false;const c=cap();if(S.sentence.length>c)S.sentence=S.sentence.slice(-c);save();renderStrip();showLvlCard();}
$('#lvlyes').onclick=()=>{setLvl(nextLvl());if(S.settings.lvlsticker)unlock('level');$('#slen').value=S.settings.slen;};$('#lvlno').onclick=()=>{S.settings.lvlsuggest=false;S.settings.lvlcount=0;save();showLvlCard();};
$('#slen').onchange=e=>setLvl(e.target.value);$('#autolvl').onchange=e=>{S.settings.autolvl=e.target.checked;save();showLvlCard();};
$('#lvlgoal').onchange=e=>{S.settings.lvlgoal=Math.max(1,Math.min(200,+e.target.value||20));e.target.value=S.settings.lvlgoal;save();showLvlCard();};
$('#clear').onclick=()=>{S.sentence=[];save();renderStrip();};
$('#undo').onclick=()=>{S.sentence.pop();save();renderStrip();};
$('#speak').innerHTML=icon('speak');$('#clear').innerHTML=icon('clear');$('#undo').innerHTML=icon('undo');
$$('#tabs [data-tab]').forEach(t=>t.onclick=()=>{tab=t.dataset.tab;render();});
// ---------- rewards (style adapted from Fidget: bubbles + spinner, warm/sage palette) ----------
let AC;function ac(){AC=AC||new (window.AudioContext||window.webkitAudioContext)();return AC;}
function pop(f,t0,vol){const a=ac(),o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.setValueAtTime(f,a.currentTime+t0);
 o.frequency.exponentialRampToValueAtTime(f*0.5,a.currentTime+t0+.12);g.gain.setValueAtTime(vol,a.currentTime+t0);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+t0+.15);
 o.connect(g).connect(OUT());o.start(a.currentTime+t0);o.stop(a.currentTime+t0+.16);}
window.__rewards=[];const RM=matchMedia('(prefers-reduced-motion: reduce)');
function reward(kind,e,k){k=k||0;let lvl=S.settings.intensity;window.__rewards.push(kind+':'+lvl);if(window.__rewards.length>50)window.__rewards.splice(0,25);if(lvl==='off'||kind==='small'||S.sleep)return;
 const R=$('#reward');if(R.childElementCount>MAXR)return;if(RM.matches){R.classList.remove('glow');void R.offsetWidth;R.classList.add('glow');if(S.settings.sound==='on'&&kind==='big')try{pipSound(0);}catch(_){}S.coll.rot++;return;}const soundOn=S.settings.sound==='on';
 if(kind==='small'){const x=e?e.clientX:innerWidth/2,y=e?e.clientY:innerHeight/2;const r=document.createElement('div');r.className='ripple';r.style.left=x+'px';r.style.top=y+'px';R.appendChild(r);setTimeout(()=>r.remove(),1000);
   if(soundOn&&lvl==='fun')try{pop(700,0,.08);}catch(_){} return;}
 const n=(lvl==='fun'?28:10)+k*(lvl==='fun'?6:3),grow=1+k*.08,shp=S.coll.anims[(S.coll.rot||0)%S.coll.anims.length]||'round',cols=['#ff7a45','#9fb4a8','#7b9cc4','#c9b26a','#b592c4'];
 for(let i=0;i<n;i++){const b=document.createElement('div');b.className='bub '+shp;const s=(18+Math.random()*(lvl==='fun'?50:28))*grow;
  b.style.cssText=`width:${s}px;height:${s}px;left:${10+Math.random()*80}%;top:${70+Math.random()*25}%;--k:${cols[i%5]};--x:${(Math.random()-.5)*120}px;--y:${-200-Math.random()*400}px;--d:${lvl==='fun'?1.6:2.2}s`;
  R.appendChild(b);setTimeout(()=>b.remove(),2400);}
 if(lvl==='fun'||k>=3){const sp=document.createElement('div');sp.className='spin';sp.innerHTML='<svg viewBox="0 0 100 100"><g fill="none" stroke="#ff7a45" stroke-width="6"><circle cx="50" cy="50" r="10"/><circle cx="50" cy="20" r="12"/><circle cx="76" cy="65" r="12"/><circle cx="24" cy="65" r="12"/></g><path d="M50 32L50 40M62 56L68 60M38 56L32 60" stroke="#9fb4a8" stroke-width="6"/></svg>';R.appendChild(sp);setTimeout(()=>sp.remove(),1500);}
 if(soundOn)try{pipSound(k);}catch(_){} if(lvl==='fun')pipDance(k);S.coll.rot++;}

// ---------- tap effects (per-device parent setting). Compositor-only: transform + opacity, one pulse, no flashing ----------
const FXL={low:{s:.96,g:.35,v:8,a:.025},medium:{s:.93,g:.55,v:14,a:.04},high:{s:.9,g:.75,v:20,a:.06}};window.__fx=0;
function tapSound(kind,vol){const a=ac(),t=a.currentTime,g=a.createGain();g.connect(OUT());
 if(kind==='click'){const o=a.createOscillator();o.type='triangle';o.frequency.setValueAtTime(1800,t);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0005,t+.03);o.connect(g);o.start(t);o.stop(t+.035);}
 else{const o=a.createOscillator();o.type='sine';o.frequency.setValueAtTime(520,t);o.frequency.exponentialRampToValueAtTime(900,t+.06);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0005,t+.09);o.connect(g);o.start(t);o.stop(t+.1);}}
function tapFx(b){const st=S.settings,L=FXL[st.fxlvl]||FXL.low,style=st.fx;window.__fx++;
 if(style!=='off'){const bounce=(style==='bounce'||style==='both')&&!RM.matches,glow=style==='glow'||style==='both';
  if(bounce)b.animate([{transform:'scale(1)'},{transform:`scale(${L.s})`,offset:.35},{transform:'scale(1)'}],{duration:180,easing:'ease-out'});
  if(glow)b.animate([{opacity:0},{opacity:L.g,offset:.3},{opacity:0}],{duration:RM.matches?320:260,easing:'ease-out',pseudoElement:'::before'});}
 if(st.haptic&&navigator.vibrate)try{navigator.vibrate(L.v);}catch(_){}
 if(st.tapsound!=='off')try{tapSound(st.tapsound,L.a);}catch(_){}}
$('#grid').addEventListener('pointerdown',e=>{const b=e.target.closest('.w:not(.empty)');if(b&&e.isPrimary!==false)tapFx(b);},{passive:true});

// ---------- reward growth: each success in a row makes the next celebration a little bigger, up to a parent cap.
// The run lives in memory only and fades quietly after 2 minutes of no success: nothing is shown, nothing is lost.
// Targets unlock collectibles that are kept forever (stickers, a new celebration shape, a star on the chart).
const GROW={off:0,slow:4,normal:2,big:1},CAPS={low:2,medium:4,high:6};let run=0,lastWin=0;window.__steps=[];
function step(){const r=GROW[S.settings.growth];if(!r)return 0;return Math.min(CAPS[S.settings.growcap]||4,Math.floor((run-1)/r));}
function success(sentence){const now=Date.now();if(now-lastWin>120000)run=0;lastWin=now;run++;const k=step();window.__steps.push(k);if(window.__steps.length>50)window.__steps.splice(0,25);
 if(sentence){S.coll.n++;if(S.coll.n%Math.max(1,S.settings.stickgoal)===0)unlock('goal');}reward('big',null,k);}
const STK=['bird','sun','leaf','heart','moon','cloud','fish','flower','apple','boat','kite','star'];
const SVGS={bird:'<path d="M20 60c0-18 14-30 32-30 10 0 18 5 22 12l14-4-8 12c0 18-14 30-34 30-14 0-26-8-26-20z" fill="#9fb4a8"/><circle cx="66" cy="44" r="4" fill="#14171a"/><path d="M36 62c8 6 18 6 26 0" stroke="#5d7468" stroke-width="5" fill="none" stroke-linecap="round"/>',
 sun:'<circle cx="50" cy="50" r="20" fill="#c9b26a"/><g stroke="#c9b26a" stroke-width="6" stroke-linecap="round"><path d="M50 10v12M50 78v12M10 50h12M78 50h12M22 22l8 8M70 70l8 8M78 22l-8 8M30 70l-8 8"/></g>',
 leaf:'<path d="M20 80C20 40 50 18 84 16c-2 34-24 64-64 64z" fill="#7fae8a"/><path d="M24 76L70 30" stroke="#4e7458" stroke-width="5" stroke-linecap="round"/>',
 heart:'<path d="M50 84L18 52c-10-10-10-26 2-34 10-6 22-2 30 8 8-10 20-14 30-8 12 8 12 24 2 34z" fill="#d98a8a"/>',
 moon:'<path d="M64 14a36 36 0 1 0 22 56A30 30 0 0 1 64 14z" fill="#b8c2d9"/>',
 cloud:'<path d="M26 72a16 16 0 0 1 2-32 22 22 0 0 1 42-6 18 18 0 0 1 6 38z" fill="#a9c1d9"/>',
 fish:'<path d="M14 50c14-20 44-24 60 0-16 24-46 20-60 0z" fill="#7b9cc4"/><path d="M74 50l14-14v28z" fill="#7b9cc4"/><circle cx="32" cy="46" r="4" fill="#14171a"/>',
 flower:'<g fill="#b592c4"><circle cx="50" cy="30" r="13"/><circle cx="70" cy="48" r="13"/><circle cx="62" cy="70" r="13"/><circle cx="38" cy="70" r="13"/><circle cx="30" cy="48" r="13"/></g><circle cx="50" cy="52" r="10" fill="#c9b26a"/>',
 apple:'<path d="M50 30c-20-10-36 4-34 24 2 22 18 34 34 28 16 6 32-6 34-28 2-20-14-34-34-24z" fill="#d97a6a"/><path d="M50 30c0-8 4-14 10-18" stroke="#6a8a5a" stroke-width="5" fill="none" stroke-linecap="round"/>',
 boat:'<path d="M14 62h72l-12 18H26z" fill="#c4956a"/><path d="M50 14v44H24z" fill="#e8e2d6"/><path d="M54 22v36h24z" fill="#9fb4a8"/>',
 kite:'<path d="M50 10l26 30-26 34-26-34z" fill="#ff9a6a"/><path d="M50 74c-4 8 4 10 0 18" stroke="#b8c2d9" stroke-width="3" fill="none"/>',
 star:'<path d="M50 12l11 24 26 3-19 18 5 26-23-13-23 13 5-26-19-18 26-3z" fill="#c9b26a"/>'};
const ANIMS=['round','leaf','star'];
function unlock(why){const c=S.coll,d=new Date().toISOString().slice(0,10);c.stars[d]=(c.stars[d]||0)+1;let msg='A new star for the chart!';
 if(c.stickers.length<STK.length){const id=STK[c.stickers.length];c.stickers.push(id);msg='A new sticker for your book!';
  if(c.stickers.length%3===0){const a=ANIMS.find(x=>!c.anims.includes(x));if(a){c.anims.push(a);msg='New sticker, and a new celebration!';}}}
 const nu=window.pipUnlocked?pipUnlocked():null;if(nu&&window.__lastU&&(nu.sounds.length>__lastU.sounds.length||nu.dances.length>__lastU.dances.length))msg+=' A new Pip sound or dance too!';window.__lastU=nu;
 save();const t=$('#toast');t.textContent=msg;t.hidden=false;clearTimeout(t._h);t._h=setTimeout(()=>t.hidden=true,3500);}
function stickerSVG(id){return `<svg viewBox="0 0 100 100" aria-hidden="true">${SVGS[id]}</svg>`;}
function renderBook(){const c=S.coll;$('#bookgrid').innerHTML=c.stickers.length?c.stickers.map(id=>`<div class="stk" role="img" aria-label="${id} sticker">${stickerSVG(id)}<span>${id}</span></div>`).join(''):'<p class="note">Stickers you earn will live here.</p>';
 const days=[...Array(7)].map((_,i)=>{const d=new Date(Date.now()-(6-i)*864e5);return [d.toISOString().slice(0,10),d.toLocaleDateString(undefined,{weekday:'short'})]});
 $('#chart').innerHTML=days.map(([k,l])=>`<div class="col"><div class="stars">${'★'.repeat(Math.min(c.stars[k]||0,8))}</div><span>${l}</span></div>`).join('');}
$('#bookbtn').onclick=()=>{renderBook();$('#book').hidden=false;};
['growth','growcap'].forEach(k=>$('#'+k).onchange=()=>{S.settings[k]=$('#'+k).value;save();});
$('#stickgoal').onchange=e=>{S.settings.stickgoal=Math.max(1,Math.min(100,+e.target.value||10));e.target.value=S.settings.stickgoal;save();};
$('#lvlsticker').onchange=e=>{S.settings.lvlsticker=e.target.checked;save();};
// ---------- mic "tried to talk" (on-device level detection only; nothing recorded) ----------
let micStream,micTimer;
async function micStart(){if(micStream||!navigator.mediaDevices)return;try{micStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});}catch(e){S.settings.mic=false;save();$('#mic').checked=false;return;}
 const a=ac(),src=a.createMediaStreamSource(micStream),an=a.createAnalyser();an.fftSize=1024;src.connect(an);const buf=new Float32Array(an.fftSize);
 let loud=0,cool=0,speaking=false;$('#micdot').hidden=false;
 micTimer=setInterval(()=>{an.getFloatTimeDomainData(buf);let s=0;for(const v of buf)s+=v*v;const rms=Math.sqrt(s/buf.length);
  const thr=0.12-S.settings.micsens*0.011;speaking=window.speechSynthesis&&speechSynthesis.speaking;
  if(cool>0){cool--;return;} if(rms>thr&&!speaking&&!$('#reward').childElementCount){loud++;if(loud>=4){loud=0;cool=60;S.stats.tries++;success(false);save();}}else loud=Math.max(0,loud-1);},100);}
function micStop(){if(micStream){micStream.getTracks().forEach(t=>t.stop());micStream=null;}clearInterval(micTimer);$('#micdot').hidden=true;}
// ---------- parent gate: hold 2s, then 3 math questions; wrong answer = lockout doubling 30s..10min ----------
let holdT,holdStart;const pb=$('#parent');pb.innerHTML='Parent · hold<span class="fill"></span>';
const hold=e=>{e.preventDefault();if(!e.isPrimary){unhold();return;}holdStart=Date.now();const f=pb.querySelector('.fill');f.style.transition='width 2s linear';f.style.width='100%';holdT=setTimeout(openGate,2000);};
const unhold=()=>{clearTimeout(holdT);const f=pb.querySelector('.fill');f.style.transition='none';f.style.width='0';};
pb.addEventListener('pointerdown',hold);['pointerup','pointerleave','pointercancel'].forEach(ev=>pb.addEventListener(ev,unhold));
let gateLock=0,gateFails=0,gateNext=null;window.__gateOpens=0;
function openGate(next){unhold();gateNext=typeof next==='function'?next:null;if(Date.now()<gateLock)return false;ask(3);$('#gate').hidden=false;return true;}
function ask(left){const a=3+Math.floor(Math.random()*7),b=3+Math.floor(Math.random()*7),ans=a+b;
 const opts=[ans,ans+1,ans+3,ans-2].sort(()=>Math.random()-.5);$('#gq').textContent=`${a} + ${b} = ?`+`  (${4-left} of 3)`;
 $('#gans').innerHTML='';opts.forEach(o=>{const x=document.createElement('button');x.textContent=o;x.setAttribute('aria-label','Answer '+o);
  x.onclick=()=>{if(o!==ans){$('#gate').hidden=true;gateFails++;if(gateNext&&window.gateFailed)gateFailed();gateNext=null;gateLock=Date.now()+Math.min(600000,30000*2**(gateFails-1));return;}if(left>1)return ask(left-1);$('#gate').hidden=true;gateFails=0;window.__gateOpens++;const nx=gateNext;gateNext=null;(nx||openPanel)();};$('#gans').appendChild(x);});}
$$('[data-close]').forEach(b=>b.onclick=()=>{b.closest('.modal').hidden=true;render();});
// ---------- parent panel ----------
$$('.ptabs button').forEach(b=>b.onclick=()=>{$$('.ptabs button').forEach(x=>x.classList.toggle('on',x===b));$$('[data-sec]').forEach(s=>s.hidden=s.dataset.sec!==b.dataset.p);if(b.dataset.p==='stats')renderStats();});
async function openPanel(){const st=S.settings;$('#panel').hidden=false;
 const vs=await voices();$('#voice').innerHTML='<option value="">Device default</option>'+vs.map((v,i)=>`<option value="${i}">${esc(v)}</option>`).join('');$('#voice').value=st.voice;
 ['rate','pitch','intensity','sound','micsens','fx','fxlvl','tapsound'].forEach(k=>$('#'+k).value=st[k]);$('#haptic').checked=st.haptic;if(window.pipPanel)pipPanel();if(window.lockPanel)lockPanel();$('#growth').value=st.growth;$('#growcap').value=st.growcap;$('#stickgoal').value=st.stickgoal;$('#lvlsticker').checked=st.lvlsticker;$('#growprog').textContent=`Sentences spoken: ${S.coll.n}. Next sticker in ${st.stickgoal-S.coll.n%st.stickgoal}. Stickers earned: ${S.coll.stickers.length}.`;$('#slen').value=st.slen;$('#autolvl').checked=st.autolvl;$('#lvlgoal').value=st.lvlgoal;showLvlCard();$('#rmnote').hidden=!RM.matches;$('#speakword').checked=st.speakword;$('#mic').checked=st.mic;$('#modelon').checked=!!st.model;renderWList();}
['voice','rate','pitch','intensity','sound','micsens','fx','fxlvl','tapsound'].forEach(k=>$('#'+k).onchange=()=>{const v=$('#'+k).value;S.settings[k]=['rate','pitch','micsens'].includes(k)?+v:v;save();});
$('#haptic').onchange=e=>{S.settings.haptic=e.target.checked;save();if(e.target.checked&&navigator.vibrate)navigator.vibrate(12);};
$('#fxtry').onclick=e=>tapFx(e.currentTarget);
$('#speakword').onchange=e=>{S.settings.speakword=e.target.checked;save();};
$('#mic').onchange=e=>{S.settings.mic=e.target.checked;save();S.settings.mic?micStart():micStop();};
$('#test').onclick=()=>{speak('I want more please');reward('big');};
// personal words
let pending=null;
function loadImg(file){const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas'),s=320,m=Math.min(im.width,im.height);c.width=c.height=s;
  c.getContext('2d').drawImage(im,(im.width-m)/2,(im.height-m)/2,m,m,0,0,s,s);pending=c.toDataURL('image/jpeg',0.8);$('#ppreview').innerHTML=`<img src="${pending}">`;};im.src=r.result;};r.readAsDataURL(file);}
['cam','gal'].forEach(id=>$('#'+id).onchange=e=>{if(e.target.files[0])loadImg(e.target.files[0]);e.target.value='';});
$('#wadd').onclick=async()=>{const l=$('#wlabel').value.trim();if(!l){$('#wlabel').focus();return;}
 const id=Date.now()+''+Math.floor(Math.random()*1000);if(pending){try{await imgPut(id,pending);IMG[id]=pending;}catch(e){alert('Could not save the photo (storage full?).');return;}}
 S.mine.push({id,label:l});save();pending=null;$('#wlabel').value='';$('#ppreview').textContent='No photo';renderWList();};
function renderWList(){$('#wlist').innerHTML=S.mine.map(m=>`<li>${IMG[m.id]?`<img src="${IMG[m.id]}" loading="lazy">`:icon('it')}<span>${esc(m.label)}</span><button class="btn" data-del="${m.id}">Remove</button></li>`).join('')||'<li>No personal words yet.</li>';
 $$('[data-del]').forEach(b=>b.onclick=()=>{if(confirm('Remove this word?')){S.mine=S.mine.filter(m=>m.id!=b.dataset.del);imgDel(b.dataset.del);delete IMG[b.dataset.del];save();renderWList();}});}
// model mode
$('#mq').oninput=()=>{const q=$('#mq').value.trim().toLowerCase();const all=[...CORE.map(c=>c[0]),...S.mine.map(m=>m.label)];
 $('#mres').innerHTML=q?all.filter(w=>w.toLowerCase().includes(q)).slice(0,12).map(w=>`<button class="btn" data-m="${esc(w)}">${esc(w)}</button>`).join(''):'';
 $$('[data-m]').forEach(b=>b.onclick=()=>{S.settings.model=b.dataset.m;$('#modelon').checked=true;save();$('#panel').hidden=true;tab=CORE.some(c=>c[0]===b.dataset.m)?'core':'mine';render();});};
$('#modelon').onchange=e=>{if(!e.target.checked)S.settings.model='';save();};
function showModel(){const m=S.settings.model;$$('.w.model,#tabs .model').forEach(x=>x.classList.remove('model'));if(!m)return;
 const inCore=CORE.some(c=>c[0]===m);if((tab==='core')!==inCore)$(`#tabs [data-tab="${inCore?'core':'mine'}"]`).classList.add('model');
 $$('.w').forEach(b=>{if(b.dataset.label===m)b.classList.add('model');});}
function renderStats(){const st=S.stats,top=Object.entries(st.words).sort((a,b)=>b[1]-a[1]).slice(0,10),days=Object.entries(st.days).sort().slice(-7);
 $('#statsout').innerHTML=`<p>Messages spoken: <b>${st.messages}</b> · Talking tries heard: <b>${st.tries}</b></p><h3>Most used words</h3><table>${top.map(([w,n])=>`<tr><td>${esc(w)}</td><td>${n}</td></tr>`).join('')||'<tr><td>None yet</td></tr>'}</table><h3>Last 7 days</h3><table>${days.map(([d,v])=>`<tr><td>${d}</td><td>${v.w} words</td><td>${v.m} messages</td></tr>`).join('')||'<tr><td>None yet</td></tr>'}</table><p style="color:var(--dim)">Stats stay on this device only. Taps in model mode are not counted.</p>`;}
$('#sreset').onclick=()=>{if(confirm('Reset all stats?')){S.stats=structuredClone(DEF.stats);save();renderStats();}};
$('#buy').onclick=()=>{/* Premium stub: billing not wired yet. */};
if('speechSynthesis' in window)speechSynthesis.onvoiceschanged=()=>{};
(async()=>{try{await imgLoadAll();
 for(const m of S.mine)if(m.img){await imgPut(m.id,m.img);IMG[m.id]=m.img;delete m.img;} save();}catch(e){console.warn('idb',e);}
 render();showLvlCard();window.__lastU=window.pipUnlocked&&pipUnlocked();window.__ready=true;})();
if(S.settings.mic)micStart();
