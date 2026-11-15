// randomised play: random answers to every popup, random deeds with random targets and places; looking for exceptions and broken invariants
const S=require(require('path').join(__dirname,'..','build','sim.js'));const seeds=(process.argv[2]||'1,2,3,4,5,6').split(',').map(Number),Y=+(process.argv[3]||140);
let errs=0;const deedCount={},evCount={},results={};
for(const seed of seeds){let r=seed*9301+7;const rnd=()=>{r=(r*1103515245+12345)&0x7fffffff;return r/0x7fffffff;};
 const W=S.createWorld(seed);S.seedFirstPop(W);const cs=S.houseCandidates(W);S.choosePlayer(W,cs[Math.floor(rnd()*cs.length)].head);const P=W.player;let y=1;
 try{for(;y<=Y&&!P.over;y++){for(let w=0;w<52;w++){S.step(W);
   while(W.pending.length){const e=W.pending[0];evCount[e.type]=(evCount[e.type]||0)+1;const k=Math.floor(rnd()*e.options.length);W.lastResult=null;S.resolve(W,e,k);if(W.pending[0]===e){throw new Error('event not consumed: '+e.type);} if(W.lastResult&&/undefined|NaN|\[object/.test(W.lastResult.title+W.lastResult.text))console.log('  BAD TEXT result',e.type,k,(W.lastResult.title+' :: '+W.lastResult.text).slice(0,200));}
   if(W.notices)for(const n of W.notices.splice(0)){if(/undefined|NaN|\[object/.test(n.title+n.text))console.log('  BAD TEXT notice',(n.title+' :: '+n.text).slice(0,200));}
   if(!P.over&&P.head.alive&&P.head.clan&&rnd()<0.06){const A=S.playerActions(W).filter(a=>a.ok);for(const a of S.playerActions(W)){if(/undefined|NaN|\[object|-\d{5,}/.test(a.label+a.hint+(a.ok?'':a.why)+(a.targets||[]).map(t=>t.label+t.hint).join()))console.log('  BAD TEXT deed',a.id,(a.label+' | '+a.hint+' | '+a.why+' | '+(a.targets||[]).map(t=>t.label+' '+t.hint).join(' / ')).slice(0,260));}
     if(A.length){const a=A[Math.floor(rnd()*A.length)],k=a.targets?Math.floor(rnd()*a.targets.length):0,tg=a.targets&&a.targets[k];let place=null,f=a.forces?Math.floor(rnd()*a.forces.length):0;
      if(tg&&tg.pick){const c=P.head.clan;for(let t=0;t<12&&!place;t++){const ang=rnd()*6.28,d=(5+rnd()*(tg.pick.maxKm||40))*1000,x=c.x+Math.cos(ang)*d,yy=c.y+Math.sin(ang)*d;if(!S.checkPlace(W,a.id,x,yy))place={x,y:yy};}if(!place)continue;}
      deedCount[a.id]=(deedCount[a.id]||0)+1;const R=S.doAction(W,a.id,k,f,place);if(R){results[a.id+':'+R.title]=(results[a.id+':'+R.title]||0)+1;if(/undefined|NaN|\[object/.test(R.title+R.text))console.log('  BAD TEXT deed result',a.id,(R.title+' :: '+R.text).slice(0,220));}}}
   if(w===30&&!P.over){const adv=S.advice(W);if(adv&&/undefined|NaN/.test(adv.text))console.log('  BAD advice',adv.text);S.legacyHTML(S.legacy(W));S.clanFlow(W,10);S.dealings(W);}
  }
  // invariants
  for(const c of W.clans){for(const q of c.people){if(!q.alive)throw new Error('dead person in clan');if(q.clan!==c)throw new Error('person.clan mismatch '+q.name);}if(!(c.store>=0)||!(c.grain>=0))throw new Error('bad stores '+c.store+' '+c.grain);for(const g in c.goods)if(!(c.goods[g]>=0))throw new Error('bad goods '+g+' '+c.goods[g]);if(!c.tribe.clans.includes(c))throw new Error('clan not in its tribe');}
  if(!P.over&&P.head.alive&&P.head.clan&&!W.clans.includes(P.head.clan))throw new Error('player clan not in world');
  if(y%45===0){const str=S.saveGame(W);const W2=S.loadGame(str);for(let i=0;i<26;i++){S.step(W2);while(W2.pending.length)S.resolve(W2,W2.pending[0],0);}}
 }}catch(e){errs++;console.log('seed',seed,'year',y,'ERROR',e.stack.split('\n').slice(0,4).join(' | '));}
 console.log('seed',seed,'done year',y,'over',P.over,'renown',Math.round(P.renown),'ambitions done',P.ambDone||0,'heads',P.heads.map(h=>h.name+(h.epithet?' '+h.epithet:'')).slice(0,4).join(', '),'cast',P.cast?[(P.cast.friend||{}).name,(P.cast.rival||{}).name].join('/'):'');
}
console.log('errors',errs);console.log('events',JSON.stringify(evCount));console.log('deeds',JSON.stringify(deedCount));console.log('results',JSON.stringify(results).slice(0,1500));
