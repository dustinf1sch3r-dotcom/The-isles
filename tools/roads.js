// measures the ways: ISLES_SIM=... node tools/roads.js [seeds=2,7,21,33] [years=200]   (option 0 throughout)
// every 50 years: edges and km of way per level (track>3, path>10, road>30; km = distance between cell centres, cdist x 5 km), cells touched by any way,
// and "side-by-side" cells (a way cell with a neighbour way running the same direction that is not joined to it; the old narrow "parallel" count is no longer printed: it flattered the result).
const path=require('path');const S=require(process.env.ISLES_SIM||path.join(__dirname,'..','build','sim.js'));
const seeds=(process.argv[2]||'2,7,21,33').split(',').map(Number),YEARS=+(process.argv[3]||200);
function mk(seed){const W=S.createWorld(seed);S.seedFirstPop(W);const cs=S.houseCandidates(W);S.choosePlayer(W,cs[seed%Math.min(5,cs.length)].head);return W;}
function yr(W){for(let w=0;w<52;w++){S.step(W);while(W.pending.length)S.resolve(W,W.pending[0],0);}}
const N=S.N,CELL=S.CELL;
function measure(W){
 const edges=[];let n=[0,0,0,0],km=[0,0,0,0];const touched=new Set();
 for(const [k,v] of W.roads){const L=S.roadLevel(v);if(!L)continue;const a=Math.floor(k/40000),b=k%40000;edges.push([a,b,L]);n[L]++;
  const ax=a%N,ay=(a/N)|0,bx=b%N,by=(b/N)|0;km[L]+=Math.hypot(W.px[a]-W.px[b],W.py[a]-W.py[b])/1000;touched.add(a);touched.add(b);}
 // index: cell -> list of edges (a,b,L,dx,dy)
 const at=new Map();for(const [a,b,L] of edges){const dx=(b%N)-(a%N),dy=((b/N)|0)-((a/N)|0);for(const c of [a,b]){if(!at.has(c))at.set(c,[]);at.get(c).push([a,b,L,dx,dy]);}}
 // a cell c is "parallel" when some edge of a way touches a cell o within 2 cells of c (Chebyshev), o lying to the side (its offset from c has a
 // sideways part of at least one cell across the direction of an edge at c, and an along part of at most one cell), the edge at o has the same or a higher level
 // and runs the same way (within 45 degrees, either direction), and o cannot be reached from c by walking along ways in 8 edges: so two lines
 // that run side by side count, a bend or a staircase of one way does not.
 const nb=new Map();for(const [a,b] of edges){if(!nb.has(a))nb.set(a,[]);if(!nb.has(b))nb.set(b,[]);nb.get(a).push(b);nb.get(b).push(a);}
 let par=0;
 for(const [c,es] of at){const cx=c%N,cy=(c/N)|0;const near=new Set([c]);let fr=[c];for(let d=0;d<8;d++){const nx=[];for(const u of fr)for(const w of nb.get(u)||[])if(!near.has(w)){near.add(w);nx.push(w);}fr=nx;}
  let hit=false;
  for(const e of es){const d1=Math.hypot(e[3],e[4]),ux=e[3]/d1,uy=e[4]/d1;
   for(let ox=-2;ox<=2&&!hit;ox++)for(let oy=-2;oy<=2&&!hit;oy++){if(!ox&&!oy)continue;const px=cx+ox,py=cy+oy;if(px<0||py<0||px>=N||py>=N)continue;const o=py*N+px;if(near.has(o))continue;
    const along=Math.abs(ox*ux+oy*uy),side=Math.abs(-ox*uy+oy*ux);if(side<0.99||along>1.01)continue;
    for(const f of at.get(o)||[]){if(f[2]<e[2])continue;const d2=Math.hypot(f[3],f[4]);if(Math.abs(e[3]*f[3]+e[4]*f[4])/(d1*d2)>=0.7071){hit=true;break;}}}
   if(hit)break;}
  if(hit)par++;}
 // second, simpler measure (no reachability rule, so braids count): a way cell with an 8-neighbour NOT joined to it by an edge, which carries a way
 // within 45 degrees of an edge at the cell and lies to its side; sbs counts all, sbs2 only where both ways are path or road.
 const adj=new Set();for(const [a,b] of edges){adj.add(a*40000+b);adj.add(b*40000+a);}
 let sbs=0,sbs2=0;
 for(const [c,es] of at){const cx=c%N,cy=(c/N)|0;let hit=false,hi=false;
  for(let ox=-1;ox<=1;ox++)for(let oy=-1;oy<=1;oy++){if(!ox&&!oy)continue;const px=cx+ox,py=cy+oy;if(px<0||py<0||px>=N||py>=N)continue;const o=py*N+px;if(adj.has(c*40000+o))continue;const fo=at.get(o);if(!fo)continue;
   for(const e of es)for(const g of fo){const l1=Math.hypot(e[3],e[4]),l2=Math.hypot(g[3],g[4]);const cs=Math.abs(e[3]*g[3]+e[4]*g[4])/l1/l2,side=Math.abs(-ox*e[4]+oy*e[3])/l1;
    if(cs>=0.7071&&side>=0.7){hit=true;if(e[2]>=2&&g[2]>=2)hi=true;}}}
  if(hit)sbs++;if(hi)sbs2++;}
 return {n,km:km.map(x=>Math.round(x)),cells:touched.size,par,sbs,sbs2};
}
const tot={};
for(const seed of seeds){const W=mk(seed);
 for(let y=1;y<=YEARS;y++){yr(W);if(y%50===0){const m=measure(W);
  console.log(`seed ${seed} year ${y}: edges track ${m.n[1]} path ${m.n[2]} road ${m.n[3]} | km track ${m.km[1]} path ${m.km[2]} road ${m.km[3]} total ${m.km[1]+m.km[2]+m.km[3]} | cells ${m.cells} | side-by-side ${m.sbs} (path+ both ${m.sbs2})`);
  const t=tot[y]=tot[y]||{km:0,cells:0,sbs:0,sbs2:0,path:0,road:0};t.km+=m.km[1]+m.km[2]+m.km[3];t.cells+=m.cells;t.sbs+=m.sbs;t.sbs2+=m.sbs2;t.path+=m.n[2];t.road+=m.n[3];}}}
for(const y of Object.keys(tot))console.log(`ALL seeds year ${y}: km ${tot[y].km} cells ${tot[y].cells} side-by-side ${tot[y].sbs} (path+ both ${tot[y].sbs2}) path edges ${tot[y].path} road edges ${tot[y].road}`);
