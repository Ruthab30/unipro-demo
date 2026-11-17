/* UniPro free demo shim.
   Replaces the Claude-hosted capabilities with free, in-browser versions:
   - sample    -> a scripted check-in that reacts to what the patient types (no live AI)
   - db        -> localStorage in the visitor's own browser
   - dictation -> the browser's Web Speech API (Chrome/Edge), if available
   - tts       -> the browser's speechSynthesis, if available
   - user      -> a fixed local user
*/
(function(){
  'use strict';

  /* ---------- storage (localStorage) ---------- */
  const PFX='unipro-demo:';
  function lsGet(k){ try{ const v=localStorage.getItem(PFX+k); return v?JSON.parse(v):null; }catch(e){ return null; } }
  function lsSet(k,v){ try{ localStorage.setItem(PFX+k,JSON.stringify(v)); }catch(e){} }
  function lsDel(k){ try{ localStorage.removeItem(PFX+k); }catch(e){} }
  function lsKeys(prefix){ const out=[]; try{ for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k&&k.startsWith(PFX+prefix+'/')){ const rest=k.slice((PFX+prefix+'/').length); if(!rest.includes('/')) out.push(k.slice(PFX.length)); } } }catch(e){} return out; }
  function docRef(path){ return { get:async()=>{ const v=lsGet(path); return { data:()=>v, exists:v!=null }; }, set:async(v)=>lsSet(path,v), delete:async()=>lsDel(path) }; }
  const db={
    doc:docRef,
    collection:(path)=>({
      doc:(k)=>docRef(path+'/'+k),
      get:async()=>({ docs: lsKeys(path).map(k=>{ const v=lsGet(k); return { data:()=>v }; }) })
    })
  };

  /* ---------- user ---------- */
  const user={ id:async()=>'local', me:async()=>({name:''}), isOwner:()=>true, canEdit:()=>true };

  /* ---------- scripted check-in engine ---------- */
  const RED=/(soak|soaking|pad (every|an) hour|clot|bleeding a lot|heavy bleeding|dizzy|faint|lightheaded|chest pain|can'?t breathe|trouble breathing|seizure|worst headache|vision|blurry)/i;
  const HARM=/(better off without me|hurt (myself|the baby|my baby)|kill myself|end my life|don'?t want to (be here|live)|not be alive)/i;
  const ADVICEQ=/(should i (take|use|try)|can i (take|use)|what should i|is it (normal|okay|ok)|is that (normal|okay|ok)|ibuprofen|tylenol|advil|motrin|what (can|do) i take)/i;
  const VAGUE=/^(fine|ok|okay|good|not sure|i don'?t know|idk|meh|alright|so-?so|it'?s fine|kind of everything)[.!]?$/i;
  const NO=/^(no|nope|nah|not really|no,? (that'?s it|nothing)|nothing( else)?|that'?s (it|all))\b/i;
  const AREAS=['down there','lower back','upper back','back','stitches','incision','my cut','the cut','belly','stomach','tummy','hips','hip','head','breasts','nipples','legs','perineum','pelvis','vagina','c-section','scar'];
  const WORDS=['really bad','pretty bad','not bad','not too bad','very bad','super sore','just achy','barely there','manageable','unbearable','terrible','horrible','awful','moderate','mild','severe','rough','sore','achy','bad','okay','ok','fine'];
  const NUMW={zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10};

  function num(t){ const m=String(t).match(/\b(10|[0-9])(\s*(\/|out of)\s*10)?\b/); if(m) return +m[1]; const w=String(t).toLowerCase().match(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten)\b/); return w?NUMW[w[1]]:null; }
  function word(t){ const l=' '+String(t).toLowerCase()+' '; for(const w of WORDS){ if(new RegExp('[^a-z]'+w.replace(/ /g,'\\s+')+'[^a-z]').test(l)) return w; } return ''; }
  function area(t){ const l=String(t).toLowerCase(); for(const a of AREAS){ if(l.includes(a)) return a; } const c=l.replace(/^(it'?s|mostly|my|the|in|on|around|i guess|um+|uh+)\s+/g,'').replace(/[.!?]/g,'').trim(); return c.split(/\s+/).slice(0,4).join(' ')||'that area'; }
  function second(t){ const l=String(t).toLowerCase(); const found=AREAS.filter(a=>l.includes(a)); return found.length>1?found[1]:null; }
  function affects(t){ return String(t).replace(/^(um+|uh+|well|so|honestly)[, ]+/i,'').replace(/[.!]+$/,'').trim(); }
  function lbl(a){ return /^(down there|there)$/.test(a)?'the soreness down there':(/^(my|the) /.test(a)?a.replace(/^my /,'your '):'your '+a); }
  function shortq(t){ const w=String(t).trim().split(/\s+/); return w.slice(0,15).join(' ').replace(/[,;]$/,''); }

  let st=null;
  function reset(){ st={step:'greet', syms:[], cur:null, pending2:null, bleed:'', stitches:'', bladder:'', tried:'', triedHelp:'', other:'', urgent:null, urgentStep:0, done:false, covered:new Set()}; }
  reset();
  const COV=()=>' [COVERED: '+[...st.covered].join(', ')+']';
  function stripNotes(s){ return String(s||'').replace(/\(App note:[\s\S]*?\)\s*$/,'').replace(/^[\s\S]*###The conversation starts now\.###\s*/,'').trim(); }

  function urgentReply(t){
    st.urgentStep++;
    const harm=st.urgent==='harm';
    if(st.urgentStep===1){
      return harm
        ? "Thank you for telling me, Jane. That took courage, and you deserve support right now. Are you safe at this moment?"
        : "I'm really glad you told me. Is this happening right now?";
    }
    if(st.urgentStep===2){
      return harm
        ? "Please reach out for help now. You can call or text 988, the Suicide and Crisis Lifeline, or call or text the National Maternal Mental Health Hotline at 1-833-852-6262, any time. If you are in danger, call 911. You can also press the red Emergency button on your screen to reach a real person."
        : "Please get help now. Call 911 or go to the nearest emergency room. You can also press the red Emergency button on your screen to reach a real person. Getting help comes first.";
    }
    st.done=true;
    return (harm
      ? "Thank you for staying with me. Please use one of those numbers now, or the Emergency button. I'm ending our check-in so you can get support. Take care, Jane."
      : "Getting help comes first, so I can't answer medicine questions right now. Please go now. I'm ending our check-in so you can get care. Take care, Jane.")+' [DONE]';
  }

  function nextQuestion(){
    // decide what to ask after finishing a symptom
    if(st.pending2){ const a=st.pending2; st.pending2=null; st.cur={area:a,rating:null,word:'',affects:'',feelsLike:'',quote:''}; st.syms.push(st.cur); st.step='feel'; return `Let's talk about ${lbl(a)} too. What does it feel like?`; }
    st.step='more'; return 'Thank you. Is there anywhere else that hurts or feels sore?';
  }

  function engine(t){
    t=String(t||'').trim();
    if(st.urgent) return urgentReply(t);
    if(HARM.test(t)){ st.urgent='harm'; return '[URGENT] '+urgentReply(t); }
    if(RED.test(t) && !/^no\b/i.test(t)){ st.urgent='body'; return '[URGENT] '+urgentReply(t); }
    if(st.step!=='greet' && ADVICEQ.test(t) && /\?|should|can i|is it|what/i.test(t)){
      return "That's a really good question for your doctor, nurse or midwife. They can tell you what's right for you. "+repeatQ();
    }
    switch(st.step){
      case 'greet':
        st.step='open';
        return "Hi Jane, I'm UniPro. Today let's talk about how your body is feeling and healing. How has your body been feeling this week?"+COV();
      case 'open':
        if(VAGUE.test(t)){ st.step='open2'; return "Thanks for checking in. Can you give me an example of how your body has felt this week?"+COV(); }
        if(AREAS.some(a=>t.toLowerCase().includes(a))) return startSym(t);
        st.step='where'; return "That sounds like a lot to deal with. Where do you feel the most pain or soreness?"+COV();
      case 'open2':
        if(AREAS.some(a=>t.toLowerCase().includes(a))) return startSym(t);
        st.step='where'; return "Thank you. Where do you feel the most pain or soreness?"+COV();
      case 'where':
        return startSym(t);
      case 'feel':
        st.step='rate';
        if(num(t)!=null) return gotRating(t);
        st.cur.feelsLike=affects(t).toLowerCase();
        return `On a scale of 0 to 10, where 10 is the worst, how much does ${lbl(st.cur.area)} bother you?`+COV();
      case 'rate':
        return gotRating(t);
      case 'affects':
        if(VAGUE.test(t)){ return "Could you give me an example, like sitting, walking, sleeping or holding the baby?"+COV(); }
        st.cur.affects=affects(t); if(!st.cur.quote) st.cur.quote=shortq(t);
        st.covered.add('function');
        return nextQuestion()+COV();
      case 'more':
        if(NO.test(t)){ return askBleed(); }
        { const a=area(t); st.cur={area:a,rating:null,word:'',affects:'',feelsLike:'',quote:''}; st.syms.push(st.cur);
          if(num(t)!=null){ st.step='rate'; return gotRating(t); }
          st.step='rate'; return `How much does ${lbl(a)} bother you, from 0 to 10?`+COV(); }
      case 'bleed':
        st.bleed=affects(t); st.step='stitch';
        return "Thank you. Do your stitches or incision, if you have them, look and feel okay? For example, any redness, swelling or fluid?"+COV();
      case 'stitch':
        st.stitches=affects(t); st.covered.add('healing'); st.step='bladder';
        return "This next one is something we ask everyone. Do you ever leak a little urine when you cough, laugh or lift something?"+COV();
      case 'bladder':
        st.bladder=affects(t); st.covered.add('bladder'); st.step='tried';
        return "Thanks for sharing that. What, if anything, have you tried for the pain?"+COV();
      case 'tried':
        st.tried=affects(t);
        if(NO.test(t)||/^nothing/i.test(t)){ st.covered.add('tried'); st.step='else'; return "That's okay. Is there anything else about your body, mood, sleep, baby or support that's on your mind today?"+COV(); }
        st.step='helped'; return "Did that help?"+COV();
      case 'helped':
        st.triedHelp=affects(t); st.covered.add('tried'); st.step='else';
        return "Thank you. Is there anything else about your body, mood, sleep, baby or support that's on your mind today?"+COV();
      case 'else':
        if(!NO.test(t)) st.other=affects(t);
        st.step='readback'; return readback()+COV();
      case 'readback':
        if(!/^(yes|yeah|yep|that'?s right|correct|right)\b/i.test(t) && !NO.test(t)) st.other=(st.other?st.other+'; ':'')+affects(t);
        st.done=true; st.step='end';
        return "Thank you for checking in, Jane. Your answers will be shared with your care team. If anything worries you, call your nurse line, and remember the Emergency button is always there if anything changes. Take care."+COV()+' [DONE]';
      default:
        st.done=true; return "Thank you, Jane. Take care. [DONE]";
    }
  }
  function startSym(t){
    const a=area(t); const b=second(t); st.pending2=b;
    st.cur={area:a,rating:null,word:'',affects:'',feelsLike:'',quote:''}; st.syms.push(st.cur); st.covered.add('pain');
    if(num(t)!=null){ st.step='rate'; return gotRating(t); }
    st.step='feel'; return `Let's start with ${lbl(a)}. What does it feel like?`+COV();
  }
  function gotRating(t){
    const n=num(t), w=word(t);
    if(w) st.cur.word=w;
    if(n==null){ return `Thanks. Could you put a number on it, from 0 to 10, where 10 is the worst?`+COV(); }
    st.cur.rating=n; st.cur.quote=shortq(t); st.step='affects'; st.covered.add('pain');
    const said = st.cur.word ? `about a ${n}, ${st.cur.word}` : `about a ${n}`;
    return `When you say ${said}, what does that make harder for you?`+COV();
  }
  function askBleed(){ st.step='bleed'; return "Thank you. How is your bleeding now, compared with a few days ago?"+COV(); }
  function repeatQ(){
    const q={open:'How has your body been feeling this week?',open2:'Can you give me an example of how your body has felt?',where:'Where do you feel the most pain or soreness?',feel:'What does it feel like?',rate:'From 0 to 10, how much does it bother you?',affects:'What does that make harder for you?',more:'Is there anywhere else that hurts?',bleed:'How is your bleeding now, compared with a few days ago?',stitch:'Do your stitches or incision look and feel okay?',bladder:'Do you ever leak a little urine when you cough, laugh or lift?',tried:'What, if anything, have you tried for the pain?',helped:'Did that help?',else:'Is there anything else on your mind today?',readback:'Did I get that right?'}[st.step]||'';
    return q+COV();
  }
  function readback(){
    const parts=st.syms.filter(s=>s.rating!=null).map(s=>`${lbl(s.area)} is about a ${s.rating}${s.word?', which you called '+s.word:''}${s.affects?'. What it makes harder: '+s.affects.replace(/[.]$/,''):''}`);
    let r='Here is what I heard. ';
    r+= parts.length ? 'You said '+parts.join('. And ')+'. ' : 'You did not give a rating today. ';
    if(st.bleed) r+=`About bleeding, you said: ${st.bleed.toLowerCase()}. `;
    return r+"Did I get that right? Is there anything you'd like to add?";
  }
  function summary(){
    const syms=st.syms.map(s=>({area:s.area,feelsLike:s.feelsLike,rating:s.rating,word:s.word,affects:s.affects,trend:'',quote:s.quote}));
    const nd=[]; if(!st.covered.has('pain')) nd.push('pain'); if(!st.covered.has('function')) nd.push('daily life'); if(!st.covered.has('healing')) nd.push('healing'); if(!st.covered.has('bladder')) nd.push('bladder and bowel'); if(!st.covered.has('tried')) nd.push('what she tried');
    const urgent = st.urgent ? [{said: st.urgentText||'Reported a red-flag symptom', toldTo: st.urgent==='harm'?'Call or text 988, the maternal mental health hotline, or 911; use the Emergency button':'Call 911 or go to the ER now; use the Emergency button', willDo:'', endedEarly:true}] : [];
    const rated=syms.filter(s=>s.rating!=null);
    return {
      overview: urgent.length ? 'Reported a red-flag symptom during the check-in and was told to get help now.' : (rated.length ? rated.map(s=>`${s.area} ${s.rating}/10${s.word?' ("'+s.word+'")':''}${s.affects?', makes '+s.affects.toLowerCase()+' hard':''}`).join('; ')+'.' : 'No ratings given.'),
      readback: rated.length ? 'You said '+rated.map(s=>`${lbl(s.area)} is about a ${s.rating}${s.word?' ('+s.word+')':''}${s.affects?', and it makes this harder: '+s.affects.replace(/[.]$/,'').toLowerCase():''}`).join('. And ')+'.' : '',
      urgent, symptoms: syms,
      healing: [st.bleed&&('Bleeding: '+st.bleed), st.stitches&&('Stitches/incision: '+st.stitches)].filter(Boolean).join('. '),
      bladderBowel: st.bladder, tried: st.tried ? st.tried+(st.triedHelp?'. Helped? '+st.triedHelp:'') : '',
      other: st.other?[st.other]:[], notDiscussed: urgent.length?[]:nd, cutShort:false
    };
  }

  const sample=async function(input,opts){
    opts=opts||{};
    let text;
    if(typeof input==='string'){
      if(input.includes('TRANSCRIPT:')){ text=JSON.stringify(summary()); return {text}; }
      text='(Demo mode: test patients need the live AI version.)'; return {text};
    }
    const msgs=Array.isArray(input)?input:[];
    const userMsgs=msgs.filter(m=>m.role==='user');
    if(msgs.length<=1){ reset(); text=engine(''); }
    else {
      const last=stripNotes(userMsgs[userMsgs.length-1].content);
      if(st.urgent===null && (RED.test(last)||HARM.test(last))) st.urgentText='"'+shortq(last)+'"';
      text=engine(last);
    }
    // simulate typing
    const visible=text.replace(/\[(URGENT|DONE)\]/g,'').replace(/\[COVERED:[^\]]*\]/g,'').trim();
    if(opts.onText){ let shown=''; const words=visible.split(' '); for(let i=0;i<words.length;i++){ shown+=(i?' ':'')+words[i]; opts.onText({text:shown,delta:words[i]}); await new Promise(r=>setTimeout(r,25)); } }
    else await new Promise(r=>setTimeout(r,500));
    return {text, modelApplied:'Scripted demo (no AI)'};
  };
  sample.json=async()=>null; sample.limits=async()=>({images:false});

  /* ---------- browser speech ---------- */
  let dictation=null;
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(SR){
    const ls={partial:[],final:[],state:[]}; let rec=null, stopping=false;
    const emit=(k,v)=>ls[k].forEach(f=>{ try{ f(v); }catch(e){} });
    dictation={
      onPartial:f=>ls.partial.push(f), onFinal:f=>ls.final.push(f), onState:f=>ls.state.push(f),
      start:()=>new Promise((res,rej)=>{
        try{
          rec=new SR(); rec.lang='en-US'; rec.interimResults=true; rec.continuous=true; stopping=false;
          rec.onresult=e=>{ let interim=''; for(let i=e.resultIndex;i<e.results.length;i++){ const r=e.results[i]; if(r.isFinal) emit('final',{text:r[0].transcript.trim()}); else interim+=r[0].transcript; } if(interim) emit('partial',{text:interim.trim()}); };
          rec.onerror=e=>{ if(e.error==='not-allowed'){ emit('state',{state:'idle',reason:'not_granted'}); rej({code:'not_granted'}); } };
          rec.onend=()=>emit('state',{state:'idle',reason:stopping?'viewer_stopped':'ended'});
          rec.start(); emit('state',{state:'listening'}); res();
        }catch(e){ rej({code:'error',message:String(e)}); }
      }),
      stop:async()=>{ stopping=true; try{ rec&&rec.stop(); }catch(e){} }
    };
  }
  let tts=null;
  if('speechSynthesis' in window){
    const ls=[]; const emit=v=>ls.forEach(f=>{ try{ f(v); }catch(e){} });
    tts={
      onState:f=>ls.push(f),
      speak:(text)=>new Promise((res,rej)=>{ try{ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(String(text).slice(0,2000)); u.rate=1; u.onstart=()=>emit({state:'speaking'}); u.onend=()=>{ emit({state:'idle',reason:'completed'}); res(); }; u.onerror=()=>{ emit({state:'idle',reason:'error'}); rej({code:'error'}); }; speechSynthesis.speak(u); }catch(e){ rej({code:'error'}); } }),
      stop:()=>{ try{ speechSynthesis.cancel(); }catch(e){} emit({state:'idle',reason:'viewer_stopped'}); }
    };
  }

  const caps={db, user, sample, dictation, tts};
  window.claude={ use:async(name)=>caps[name]||null };
})();
