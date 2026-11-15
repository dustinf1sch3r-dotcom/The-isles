const S=require(require('path').join(__dirname,'..','build','sim.js'));let games=0,succ=0,swAlive=0,clanCh=0,famCh=0,yrs=0;const ex=[];
for(const seed of [3,5,8,11,14,17,20,23,26,29]){const W=S.createWorld(seed);S.seedFirstPop(W,4);const cs=S.houseCandidates(W);S.choosePlayer(W,cs[seed%Math.min(5,cs.length)].head);const P=W.player;games++;let h=P.head,cl=h.clan,fam=h.fam,famMem=new Set(cl.people.filter(q=>q.fam===fam));
 for(let wk=0;wk<52*120&&!P.over;wk++){S.step(W);while(W.pending.length)S.resolve(W,W.pending[0],0);if(W.notices)W.notices.length=0;
  if(P.over)break;const y=Math.floor(W.week/52);
  if(P.head!==h){succ++;if(h.alive){swAlive++;if(ex.length<6)ex.push('seed'+seed+' y'+y+': head changed while '+h.name+' ('+h.sex+','+Math.floor(h.age)+') still alive → '+P.head.name+' | '+(P.hist[P.hist.length-1]||{t:''}).t.replace(/<[^>]+>/g,'').slice(0,150));}h=P.head;cl=h.clan;fam=h.fam;famMem=new Set(cl?cl.people.filter(q=>q.fam===fam):[]);continue;}
  if(h.clan!==cl){clanCh++;if(ex.length<9)ex.push('seed'+seed+' y'+y+': same head '+h.name+' moved clan '+cl.name+' → '+(h.clan?h.clan.name:'-'));cl=h.clan;}
  if(h.fam!==fam){famCh++;const now=new Set(h.clan.people.filter(q=>q.fam===h.fam));const kept=[...famMem].filter(q=>now.has(q)&&q.alive).length;if(ex.length<12)ex.push('seed'+seed+' y'+y+': '+h.name+"'s household changed: was "+[...famMem].filter(q=>q.alive).length+' people, now '+now.size+' (kept '+kept+')');fam=h.fam;famMem=now;}
  else if(wk%52===0)famMem=new Set(h.clan.people.filter(q=>q.fam===fam));}
 yrs+=Math.floor(W.week/52);}
console.log('games',games,'years',yrs,'| head changes',succ,'of which previous head still alive (left by marriage):',swAlive,'| same head moved clan:',clanCh,'| same head, new household:',famCh);console.log(ex.join('\n'));
