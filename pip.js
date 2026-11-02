// Pip sounds & dance: original WebAudio synthesis and original visuals. Nothing sampled, licensed or imitated.
// Rules: plays only after the child communicates (Speak / talking try) or a parent Preview, at most 3 s, never loops or autoplays,
// soft attack + limiter + parent volume cap (max 70%), no flashing (one fade in, one fade out; motion only, under 3 Hz).
(()=>{
const D={soundset:'auto',dance:'auto',pitchr:'medium',volcap:.5,rlen:2,soft:false,session:0};
for(const k in D)if(S.settings[k]===undefined)S.settings[k]=D[k];
if(S.coll.rot===undefined)S.coll.rot=0;
const SND={chimes:0,warble:2,boing:4,vowel:6},DAN={shapes:0,pip:3,stars:6};  // unlocks at N stickers: fixed, predictable
const SNAME={chimes:'Rising chimes',warble:'Soft warble',boing:'Boing',vowel:'Ooo-AH'},DNAME={shapes:'Bright shapes',pip:'Pip dance',stars:'Star swirl'};
const unl=(T)=>Object.keys(T).filter(k=>S.coll.stickers.length>=T[k]);window.pipUnlocked=()=>({sounds:unl(SND),dances:unl(DAN)});
const PENTA=[1,9/8,5/4,3/2,5/3,2,9/4,5/2,3];const BASE={low:196,medium:262,high:349},SPAN={low:4,medium:6,high:8};
let M=null;window.OUT=function(){const a=ac();if(!M){const c=a.createDynamicsCompressor();c.threshold.value=-14;c.knee.value=6;c.ratio.value=12;c.attack.value=.003;c.release.value=.2;
 M=a.createGain();M.connect(c).connect(a.destination);}M.gain.value=Math.min(.7,Math.max(.05,+S.settings.volcap||.5));return M;};
window.__snd=[];
window.__peaks=[];function env(g,t,peak,dur){window.__peaks.push(peak);if(window.__peaks.length>200)window.__peaks.splice(0,100);const a=S.settings.soft?.09:.025;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(.0001,t+Math.max(a+.05,dur));}
function osc(type,f,t,dur,peak,dest){const a=ac(),o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f,t);env(g,t,peak,dur);o.connect(g).connect(dest||OUT());o.start(t);o.stop(t+dur+.05);return o;}
function pick(T,setting,name){const u=unl(T),v=S.settings[setting];if(v!=='auto'&&u.includes(v))return v;return u[S.coll.rot%u.length];}
window.pipSound=function(k=0,force){const a=ac(),t=a.currentTime+.02,st=S.settings,L=Math.min(3,+st.rlen||2),b=BASE[st.pitchr]||262,sp=SPAN[st.pitchr]||6,set=force||pick(SND,'soundset');window.__snd.push(set);if(window.__snd.length>50)window.__snd.splice(0,25);
 if(set==='chimes'){const n=Math.min(sp,3+k);for(let i=0;i<n;i++){const ti=t+i*Math.min(.16,(L-.6)/n),f=b*PENTA[i];osc('sine',f,ti,.7,.16);osc('sine',f*2,ti,.4,.04);}}
 else if(set==='warble'){const o=osc('sine',b,t,L*.8,.18),l=a.createOscillator(),lg=a.createGain();o.frequency.exponentialRampToValueAtTime(b*PENTA[Math.min(sp-1,3+(k>>1))],t+L*.5);
  l.frequency.value=5.5;lg.gain.value=b*.03;l.connect(lg).connect(o.frequency);l.start(t);l.stop(t+L);if(k>=2)osc('sine',b*1.5,t+.15,L*.6,.07);}
 else if(set==='boing'){const n=Math.min(3,1+(k>>1));for(let i=0;i<n;i++){const ti=t+i*.38,f=b*PENTA[i*2%sp],o=osc('triangle',f*.8,ti,.36,.17);
  o.frequency.exponentialRampToValueAtTime(f*1.9,ti+.1);o.frequency.exponentialRampToValueAtTime(f*1.1,ti+.32);}}
 else{ // sung vowel "ooo-AH": filtered sawtooth with two formants gliding oo -> ah while pitch rises a fifth. Low-passed so it is never buzzy.
  const d=Math.min(L,1.6),o=a.createOscillator(),g=a.createGain(),lp=a.createBiquadFilter(),f1=a.createBiquadFilter(),f2=a.createBiquadFilter(),mix=a.createGain();
  o.type='sawtooth';o.frequency.setValueAtTime(b,t);o.frequency.setValueAtTime(b,t+d*.4);o.frequency.exponentialRampToValueAtTime(b*1.5,t+d*.55);
  lp.type='lowpass';lp.frequency.value=2200;[f1,f2].forEach(f=>{f.type='bandpass';f.Q.value=7;});
  f1.frequency.setValueAtTime(300,t);f1.frequency.setValueAtTime(300,t+d*.4);f1.frequency.linearRampToValueAtTime(730,t+d*.55);
  f2.frequency.setValueAtTime(870,t);f2.frequency.setValueAtTime(870,t+d*.4);f2.frequency.linearRampToValueAtTime(1090,t+d*.55);
  env(g,t,.5,d);mix.gain.value=3.5;o.connect(lp);lp.connect(f1).connect(mix);lp.connect(f2).connect(mix);mix.connect(g).connect(OUT());
  const l=a.createOscillator(),lg=a.createGain();l.frequency.value=5;lg.gain.value=b*.012;l.connect(lg).connect(o.frequency);l.start(t+d*.5);l.stop(t+d);o.start(t);o.stop(t+d+.05);}
 return set;};
// ---- dance stage: dark background, bright shapes / Pip moving smoothly
const SH={circle:'<circle cx="50" cy="50" r="40"/>',tri:'<path d="M50 8L92 88H8z"/>',sq:'<rect x="12" y="12" width="76" height="76" rx="14"/>',star:'<path d="M50 6l12 28 30 3-23 20 7 30-26-16-26 16 7-30L8 37l30-3z"/>',half:'<path d="M10 60a40 40 0 0 1 80 0z"/>'};
const COLS=['#ff8a5c','#ffd166','#6fdc8c','#5cc8ff','#c49bff','#ff9ec4','#9ff0e0'];
const PIP='<svg viewBox="0 0 120 120"><ellipse cx="60" cy="70" rx="38" ry="32" fill="#9fb4a8"/><circle cx="60" cy="40" r="24" fill="#9fb4a8"/><circle cx="68" cy="36" r="5" fill="#14171a"/><path d="M82 42l16 4-16 6z" fill="#ffb15c"/><path class="wing" d="M30 66c-14-4-20 8-12 18 8 6 18 2 22-6z" fill="#7f9a8c"/><path d="M48 100l-4 12M70 100l4 12" stroke="#ffb15c" stroke-width="5" stroke-linecap="round"/></svg>';
window.pipDance=function(k=0,force){const st=S.settings,L=Math.min(3,+st.rlen||2)*1000,set=force||pick(DAN,'dance');let g=$('#stage');if(!g){g=document.createElement('div');g.id='stage';g.setAttribute('aria-hidden','true');document.body.appendChild(g);}
 if(g.childElementCount)return set;window.__dance=(window.__dance||[]).slice(-20).concat(set);g.hidden=false;const ease={easing:'ease-in-out'};
 const add=(html,cls)=>{const d=document.createElement('div');d.className='act '+(cls||'');d.innerHTML=html;g.appendChild(d);return d;};
 const sway=(el,dx,dy,rot,per,delay)=>el.animate([{transform:'translate(0,0) rotate(0)'},{transform:`translate(${dx}px,${dy}px) rotate(${rot}deg)`},{transform:'translate(0,0) rotate(0)'}],{duration:per,iterations:Math.max(1,Math.floor((L-(delay||0))/per)),delay:delay||0,...ease});
 if(set==='pip'){const p=add(PIP,'pip');sway(p,0,-26,6,800);const w=p.querySelector('.wing');w&&w.animate([{transform:'rotate(0)'},{transform:'rotate(-25deg)'},{transform:'rotate(0)'}],{duration:400,iterations:Math.floor(L/400),...ease});
  for(let i=0;i<3+k;i++){const n=add('<svg viewBox="0 0 100 100"><g fill="'+COLS[i%7]+'">'+SH.circle+'</g></svg>','dot');n.style.left=(12+i*76/(3+k))+'%';n.style.top='78%';sway(n,0,-40-i%3*15,0,900,i*120);}}
 else if(set==='stars'){const n=5+k;for(let i=0;i<n;i++){const s=add('<svg viewBox="0 0 100 100"><g fill="'+COLS[i%7]+'">'+SH.star+'</g></svg>','star');const ang=i/n*Math.PI*2;s.style.left=(50+34*Math.cos(ang))+'%';s.style.top=(48+24*Math.sin(ang))+'%';
  s.animate([{transform:'rotate(0) scale(.9)'},{transform:'rotate(40deg) scale(1.1)'},{transform:'rotate(0) scale(.9)'}],{duration:1200,iterations:Math.max(1,Math.floor((L-i*80)/1200)),delay:i*80,...ease});}}
 else{const ks=Object.keys(SH),n=5+k;for(let i=0;i<n;i++){const s=add('<svg viewBox="0 0 100 100"><g fill="'+COLS[i%7]+'">'+SH[ks[i%5]]+'</g></svg>','shape');s.style.left=(6+i*(88/n))+'%';s.style.top=(38+(i%2)*14)+'%';sway(s,0,i%2?-30:30,i%2?12:-12,600,i*60);}}
 g.animate([{opacity:0},{opacity:1,offset:Math.min(.15,250/L)},{opacity:1,offset:1-Math.min(.2,400/L)},{opacity:0}],{duration:L,fill:'forwards'}).onfinish=()=>{g.innerHTML='';g.hidden=true;};
 return set;};
// ---- session timer + goodnight wind-down (talking always keeps working)
let tick=null;function sessUI(){const st=S.settings,bar=$('#sessbar'),left=S.sessEnd?S.sessEnd-Date.now():0;
 if(!st.session||!S.sessEnd){bar.hidden=true;}else{bar.hidden=false;bar.style.width=Math.max(0,100*left/(st.session*60000))+'%';bar.classList.toggle('sleepy',left<120000);}
 $('#sleepnote').hidden=!S.sleep;if(S.sessEnd&&left<=0&&!S.sleep)goodnight();
 const i=$('#sessinfo');if(i)i.textContent=S.sleep?'Pip is asleep. Rewards are resting; talking still works.':st.session&&S.sessEnd?`About ${Math.max(0,Math.ceil(left/60000))} min left before Pip's goodnight.`:'No session timer.';}
function goodnight(){S.sleep=true;S.sessEnd=0;save();if(S.settings.sound==='on')try{const a=ac(),t=a.currentTime+.05,b=BASE[S.settings.pitchr]||262;[5,4,3,1,0].forEach((p,i)=>osc('sine',b*PENTA[p],t+i*.5,1.2,.1));}catch(_){}
 let g=$('#stage');if(!g){g=document.createElement('div');g.id='stage';document.body.appendChild(g);}g.innerHTML='';g.hidden=false;
 const d=document.createElement('div');d.className='act pip sleep';d.innerHTML=PIP+'<p>Goodnight, Pip</p>';g.appendChild(d);d.querySelector('circle[r="5"]').setAttribute('r','1.5');
 if(!RM.matches)d.animate([{transform:'translateY(0)'},{transform:'translateY(18px)'}],{duration:4000,easing:'ease-in-out',fill:'forwards'});
 g.animate([{opacity:0},{opacity:1,offset:.15},{opacity:1,offset:.75},{opacity:0}],{duration:5000,fill:'forwards'}).onfinish=()=>{g.innerHTML='';g.hidden=true;};window.__goodnight=(window.__goodnight||0)+1;sessUI();}
window.pipSession=function(min){S.settings.session=+min;S.sleep=false;S.sessEnd=+min?Date.now()+min*60000:0;save();clearInterval(tick);if(S.sessEnd)tick=setInterval(sessUI,5000);sessUI();};
window.pipWake=()=>pipSession(S.settings.session);window.pipGoodnight=goodnight;
if(S.sessEnd)tick=setInterval(sessUI,5000);
// ---- parent settings wiring
function fillSel(id,T,N){const s=$('#'+id),n=S.coll.stickers.length;s.innerHTML='<option value="auto">Take turns (in order)</option>'+Object.keys(T).map(k=>`<option value="${k}" ${n<T[k]?'disabled':''}>${N[k]}${n<T[k]?` (after ${T[k]} stickers)`:''}</option>`).join('');s.value=S.settings[id];}
window.pipPanel=function(){const st=S.settings;fillSel('soundset',SND,SNAME);fillSel('dance',DAN,DNAME);$('#pitchr').value=st.pitchr;$('#volcap').value=Math.round(st.volcap*100);$('#volv').textContent=Math.round(st.volcap*100)+'%';
 $('#rlen').value=String(st.rlen);$('#softon').checked=!!st.soft;$('#session').value=String(st.session);sessUI();};
['soundset','dance','pitchr'].forEach(k=>$('#'+k).onchange=e=>{S.settings[k]=e.target.value;save();});
$('#volcap').oninput=e=>{S.settings.volcap=Math.min(.7,Math.max(.1,e.target.value/100));$('#volv').textContent=e.target.value+'%';save();};
$('#rlen').onchange=e=>{S.settings.rlen=Math.min(3,+e.target.value);save();};$('#softon').onchange=e=>{S.settings.soft=e.target.checked;save();};
$('#softpreset').onclick=()=>{Object.assign(S.settings,{soft:true,soundset:'chimes',pitchr:'low',volcap:.3,rlen:1,tapsound:'off',growcap:'low',intensity:S.settings.intensity==='fun'?'calm':S.settings.intensity});save();pipPanel();
 ['tapsound','growcap','intensity'].forEach(k=>{const e=$('#'+k);if(e)e.value=S.settings[k];});$('#softnote').hidden=false;};
$('#preview').onclick=()=>{const k=CAPS_K();try{if(S.settings.sound==='on')pipSound(k);}catch(_){}if(!RM.matches)pipDance(k);};
function CAPS_K(){return {low:2,medium:4,high:6}[S.settings.growcap]||4;}
$('#session').onchange=e=>pipSession(e.target.value);$('#wake').onclick=()=>pipWake();
sessUI();
})();
