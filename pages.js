/* Page renderers. Each page calls the one it needs; everything is live. */
(function(){
const B=window.BNB, esc=B.esc, f1=B.f1;
const $=s=>document.querySelector(s);

function standTable(rows,limit){
  const r=limit?rows.slice(0,limit):rows;
  return '<div class="scroll"><table class="stand"><thead><tr><th></th><th>Team</th>'
   +'<th class="num">Record</th><th class="num">PF</th><th class="num">PA</th>'
   +'<th class="num">Avg</th><th class="num">Won</th></tr></thead><tbody>'
   +r.map((x,i)=>'<tr><td class="rk">'+(i+1)+'</td><td class="tm">'+esc(x.t)+'</td>'
     +'<td class="num b">'+x.w+'-'+x.l+(x.tie?'-'+x.tie:'')+'</td>'
     +'<td class="num">'+f1(x.pf)+'</td><td class="num dim">'+f1(x.pa)+'</td>'
     +'<td class="num">'+f1(x.pf/x.scores.length)+'</td>'
     +'<td class="num b">$'+(x.high*B.WKPAY)+'</td></tr>').join('')
   +'</tbody></table></div>';
}
function h2h(g){
  const la=(g.ea.starters||[]).filter(Boolean), lb=(g.eb.starters||[]).filter(Boolean);
  const pa=g.ea.players_points||{}, pb=g.eb.players_points||{};
  const n=Math.max(la.length,lb.length,B.SLOTS.length);
  let rows='';
  for(let i=0;i<n;i++){
    const A=la[i], Bd=lb[i];
    const av=A?(pa[A]||0):0, bv=Bd?(pb[Bd]||0):0;
    const sl=B.SLAB[B.SLOTS[i]]||B.SLOTS[i]||'';
    const d=Math.abs(Math.round(av*10)-Math.round(bv*10))/10;
    const ar=av>bv?'◂':'▸';
    const mg=d>=0.05?('<span class="mg">'+(av>bv?ar:'')+f1(d)+(bv>av?ar:'')+'</span>'):'';
    rows+='<tr><td class="hn">'+esc(A?B.nm(A):'')+'</td>'
      +'<td class="hp'+(av>bv?' w':'')+'">'+f1(av)+'</td>'
      +'<td class="hs">'+esc(sl)+mg+'</td>'
      +'<td class="hp'+(bv>av?' w':'')+'">'+f1(bv)+'</td>'
      +'<td class="hn r">'+esc(Bd?B.nm(Bd):'')+'</td></tr>';
  }
  rows+='<tr class="htot"><td class="hn">Total</td><td class="hp'+(g.pa>g.pb?' w':'')+'">'+f1(g.pa)+'</td>'
    +'<td class="hs"></td><td class="hp'+(g.pb>g.pa?' w':'')+'">'+f1(g.pb)+'</td>'
    +'<td class="hn r">Total</td></tr>';
  return '<div class="scroll"><table class="h2h"><tbody>'+rows+'</tbody></table></div>';
}
function gameBlock(g){
  return '<details class="game"><summary><span class="gt">'+esc(g.a)+'</span>'
    +'<span class="gs'+(g.pa>g.pb?' win':'')+'">'+f1(g.pa)+'</span><span class="gv">vs</span>'
    +'<span class="gs'+(g.pb>g.pa?' win':'')+'">'+f1(g.pb)+'</span>'
    +'<span class="gt r">'+esc(g.b)+'</span></summary>'
    +'<div class="gbody1">'+h2h(g)+'</div></details>';
}
function recap(S){
  if(!S.weekly.length) return '';
  const x=S.weekly[S.weekly.length-1];
  const mar=g=>Math.abs(Math.round(g.pa*10)-Math.round(g.pb*10))/10;
  const gs=x.games.slice().sort((a,b)=>mar(b)-mar(a));
  const blow=gs[0], close=gs[gs.length-1];
  const sc=[]; x.games.forEach(g=>{sc.push([g.pa,g.a]);sc.push([g.pb,g.b]);});
  sc.sort((a,b)=>b[0]-a[0]);
  const hi=sc[0], lo=sc[sc.length-1];
  const w=g=>g.pa>g.pb?[g.a,g.pa,g.b,g.pb]:[g.b,g.pb,g.a,g.pa];
  const bw=w(blow), cw=w(close), bm=mar(blow), cm=mar(close);
  const all=[];
  x.games.forEach(g=>{
    [[g.ea,g.a],[g.eb,g.b]].forEach(([e,t])=>{
      (e.starters||[]).filter(Boolean).forEach(id=>all.push([(e.players_points||{})[id]||0,B.nm(id),t]));});
  });
  all.sort((a,b)=>b[0]-a[0]);
  const best=all[0], duds=all.filter(p=>p[0]<4).slice(-3);
  const lines=[['High score',hi[1]+' at '+f1(hi[0])+', worth $'+B.WKPAY],
    ['Low score',lo[1]+' at '+f1(lo[0])],
    ['Blowout',bw[0]+' over '+bw[2]+' by '+f1(bm)],
    ['Closest',cw[0]+' over '+cw[2]+' by '+f1(cm)]];
  if(best) lines.push(['Top scorer',best[1]+' ('+best[2]+') with '+f1(best[0])]);
  if(duds.length) lines.push(['Started and forgot to score',
    duds.map(d=>d[1]+' '+f1(d[0])).join(', ')]);
  const rows=x.games.slice().sort((a,b)=>Math.max(b.pa,b.pb)-Math.max(a.pa,a.pb)).map(g=>{
    const q=w(g);
    return '<tr><td class="l tm">'+esc(q[0])+'</td><td class="num b">'+f1(q[1])+'</td>'
      +'<td class="num dim">'+f1(q[3])+'</td><td class="l">'+esc(q[2])+'</td>'
      +'<td class="num">'+f1(mar(g))+'</td></tr>';}).join('');
  return '<h2>Week '+x.week+' recap</h2><div class="card">'
    +'<p class="rlead">'+esc(hi[1])+' put up '+f1(hi[0])+' to take the weekly money. '
    +esc(bw[0])+' handed '+esc(bw[2])+' the worst beating of the week by '+f1(bm)+', while '
    +esc(cw[0])+' edged '+esc(cw[2])+' by '+f1(cm)+'.</p>'
    +'<div class="scroll"><table class="recap"><thead><tr><th class="l">Winner</th>'
    +'<th class="num">Score</th><th class="num">Opp</th><th class="l">Loser</th>'
    +'<th class="num">Margin</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
    +'<div class="rlines">'+lines.map(l=>'<div class="rl"><span class="rll">'+esc(l[0])
      +'</span><span class="rlv">'+esc(l[1])+'</span></div>').join('')+'</div></div>';
}
const EMPTY='<div class="empty"><strong>Nothing to show yet</strong>'
 +'Week 1 kicks off September 10. This fills in on its own as games are played.</div>';

window.RENDER={
 _game:gameBlock,
 async home(){
  const el=$('#standWrap'), rl=$('#recapWrap');
  try{
    const D=await B.load(), S=B.standings(D);
    el.innerHTML=S.rows.length?standTable(S.rows,8):EMPTY;
    rl.innerHTML=recap(S);
    const wc=$('#wkCount'); if(wc) wc.textContent=S.weekly.length+' of '+B.C.regWeeks+' weeks played';
  }catch(e){ B.err(el); }
 },
 async standings(){
  const el=$('#standWrap');
  try{
    const D=await B.load(), S=B.standings(D);
    if(!S.rows.length){ el.innerHTML=EMPTY; return; }
    const avg=S.rows.slice().sort((a,b)=>(b.pf/b.scores.length)-(a.pf/a.scores.length));
    const earn={}; S.rows.forEach(r=>earn[r.t]=r.high*B.WKPAY);
    const paid=Object.values(earn).reduce((a,b)=>a+b,0);
    el.innerHTML='<h2>By record</h2>'+standTable(S.rows)
      +'<h2>By scoring average</h2><div class="scroll"><table class="stand"><thead><tr><th></th>'
      +'<th>Team</th><th class="num">Avg</th><th class="num">Best</th><th class="num">Worst</th>'
      +'</tr></thead><tbody>'+avg.map((x,i)=>'<tr><td class="rk">'+(i+1)+'</td>'
      +'<td class="tm">'+esc(x.t)+'</td><td class="num b">'+f1(x.pf/x.scores.length)+'</td>'
      +'<td class="num">'+f1(Math.max.apply(null,x.scores))+'</td>'
      +'<td class="num dim">'+f1(Math.min.apply(null,x.scores))+'</td></tr>').join('')
      +'</tbody></table></div>'
      +'<h2>Money</h2><details class="fold"><summary><span class="tn">Payouts</span></summary>'
      +'<div class="scroll"><table><thead><tr><th>Prize</th><th class="num">Amount</th><th></th>'
      +'</tr></thead><tbody>'+B.M.payouts.map(p=>'<tr><td>'+esc(p.label)+'</td>'
      +'<td class="num b">$'+p.amount+'</td><td class="dim">'+esc(p.note||'')+'</td></tr>').join('')
      +'</tbody></table></div></details>'
      +'<details class="fold"><summary><span class="tn">Money standings</span>'
      +'<span class="sma">$'+paid+' of $'+(B.WKPAY*B.C.regWeeks)+' paid</span></summary>'
      +'<div class="scroll"><table class="stand"><thead><tr><th></th><th>Team</th>'
      +'<th class="num">Won</th><th class="num">Weeks</th></tr></thead><tbody>'
      +Object.entries(earn).sort((a,b)=>b[1]-a[1]).map((e,i)=>'<tr><td class="rk">'+(i+1)+'</td>'
      +'<td class="tm">'+esc(e[0])+'</td><td class="num b">$'+e[1]+'</td>'
      +'<td class="num dim">'+(e[1]/B.WKPAY)+'</td></tr>').join('')
      +'</tbody></table></div></details>';
  }catch(e){ B.err(el); }
 },
 async teams(){
  const el=$('#teamsWrap');
  try{
    const D=await B.load(), S=B.standings(D);
    const order={}; S.rows.forEach((r,i)=>order[r.t]=i);
    const pts={};                       // season points per player
    D.weeks.forEach(wk=>wk.raw.forEach(e=>{
      Object.entries(e.players_points||{}).forEach(([id,v])=>{pts[id]=(pts[id]||0)+(v||0);});}));
    const nwk=D.weeks.length;
    const list=D.rosters.map(r=>({t:D.RT[r.roster_id],r:r,
      rank:order[D.RT[r.roster_id]]!==undefined?order[D.RT[r.roster_id]]:99}))
      .sort((a,b)=>a.rank-b.rank);
    el.innerHTML=list.map((x,i)=>{
      const ids=(x.r.players||[]);
      const starters=(x.r.starters||[]).filter(Boolean);
      const filled=starters.length===B.SLOTS.length
        ? B.SLOTS.map((s,k)=>[B.SLAB[s]||s,starters[k]])
        : B.fillSlots(ids).out.map(o=>[B.SLAB[o[0]]||o[0],o[1]]);
      const used=new Set(filled.map(f=>f[1]));
      const bench=ids.filter(id=>!used.has(id));
      const row=(slot,id,dim)=>'<tr><td class="slot'+(dim?' dim':'')+'">'+esc(slot)+'</td>'
        +'<td class="l">'+esc(id?B.nm(id):'empty')+'</td><td class="pp">'+esc(B.pos(id))+'</td>'
        +'<td class="pp">'+esc(B.tm(id))+'</td>'
        +'<td class="num'+(dim?' dim':' b')+'">'+(pts[id]!==undefined?f1(pts[id]):(nwk?'0.0':'-'))+'</td>'
        +'<td class="num'+(dim?' dim':'')+'">'+(nwk?f1((pts[id]||0)/nwk):'-')+'</td></tr>';
      const rec=S.rec[x.t];
      const sub=rec&&rec.scores.length
        ? '<span class="pill live">'+rec.w+'-'+rec.l+'</span><span class="sma">'
          +f1(rec.pf/rec.scores.length)+' avg</span>' : '';
      return '<details class="fold"><summary><span class="tr">'+(i+1)+'</span>'
        +'<span class="tn">'+esc(x.t)+'</span>'+sub+'</summary>'
        +'<div class="scroll"><table class="rost"><thead><tr><th></th><th>Player</th>'
        +'<th>Position</th><th>Team</th><th class="num">2026 points</th>'
        +'<th class="num">Pts / week</th></tr></thead><tbody>'
        +filled.map(f=>row(f[0],f[1],false)).join('')
        +(bench.length?'<tr class="sep"><td colspan="6">Bench</td></tr>'
          +bench.map(id=>row('BN',id,true)).join(''):'')
        +'</tbody></table></div></details>';
    }).join('');
  }catch(e){ B.err(el); }
 },
 async weeks(){
  const el=$('#weeksWrap');
  try{
    const D=await B.load(), S=B.standings(D);
    if(!S.weekly.length){ el.innerHTML=EMPTY; return; }
    el.innerHTML=S.weekly.slice().reverse().map(x=>
      '<details class="wk"><summary><span class="wkh">Week '+x.week+'</span>'
      +'<span class="wkhi"><span class="pill live">High score</span>'
      +'<b class="wkn">'+esc(x.hi[0])+'</b><span class="wkp">'+f1(x.hi[1])+'</span>'
      +'<span class="wkd">$'+B.WKPAY+'</span></span></summary>'
      +'<div class="wkbody">'+x.games.map(gameBlock).join('')+'</div></details>').join('');
  }catch(e){ B.err(el); }
 },
 async waivers(){
  const el=$('#wvWrap');
  try{
    const D=await B.load();
    const budget=B.C.faab;
    const spent={}; Object.values(D.RT).forEach(t=>spent[t]=0);
    const items=[];
    const upto=Math.max(1,D.week);
    for(let w=1;w<=upto;w++){
      let tx; try{ tx=await B.j(B.API+'league/'+B.LG+'/transactions/'+w);}catch(e){continue;}
      (tx||[]).filter(t=>t.status==='complete').forEach(t=>{
        const who=(t.roster_ids||[]).map(r=>D.RT[r]).filter(Boolean);
        const bid=(t.settings&&t.settings.waiver_bid)||0;
        (t.roster_ids||[]).forEach(r=>{const nme=D.RT[r]; if(nme&&bid) spent[nme]=(spent[nme]||0)+bid;});
        items.push({week:w,type:t.type,team:who.join(', '),bid:bid,
          adds:Object.keys(t.adds||{}).map(B.nm),drops:Object.keys(t.drops||{}).map(B.nm),
          created:t.created});
      });
    }
    items.sort((a,b)=>b.created-a.created);
    const label={waiver:'Waiver',free_agent:'Free agent',trade:'Trade'};
    const budgets='<div class="scroll"><table class="stand"><thead><tr><th></th><th>Team</th>'
      +'<th class="num">Spent</th><th class="num">Left</th></tr></thead><tbody>'
      +Object.entries(spent).sort((a,b)=>b[1]-a[1]).map((e,i)=>'<tr><td class="rk">'+(i+1)+'</td>'
      +'<td class="tm">'+esc(e[0])+'</td><td class="num b">$'+e[1]+'</td>'
      +'<td class="num">$'+(budget-e[1])+'</td></tr>').join('')+'</tbody></table></div>';
    const rows=items.length? items.map(t=>'<tr><td class="num dim">'+t.week+'</td>'
      +'<td class="pp">'+esc(label[t.type]||t.type)+'</td>'
      +'<td class="tm l">'+esc(t.team)+'</td>'
      +'<td class="l">'+(t.adds.length?esc(t.adds.join(', ')):'<span class="dim">-</span>')+'</td>'
      +'<td class="l dim">'+(t.drops.length?esc(t.drops.join(', ')):'-')+'</td>'
      +'<td class="num b">'+(t.bid?'$'+t.bid:'<span class="dim">-</span>')+'</td></tr>').join('')
      : '<tr><td colspan="6" class="l dim">No moves yet.</td></tr>';
    el.innerHTML='<h2>FAAB budgets</h2>'+budgets
      +'<h2>Every move</h2><div class="scroll"><table class="stand"><thead><tr>'
      +'<th class="num">Wk</th><th>Type</th><th>Team</th><th>Added</th><th>Dropped</th>'
      +'<th class="num">Bid</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
  }catch(e){ B.err(el); }
 }
};
})();
