/* Page renderers. Each page calls the one it needs; every number is live. */
(function(){
const B=window.BNB, esc=B.esc, f1=B.f1;
const $=s=>document.querySelector(s);
const round1=v=>Math.round(v*10);                 // margins come off the numbers
const marg=(a,b)=>Math.abs(round1(a)-round1(b))/10;   // the reader can actually see

/* ---------- standings ---------- */
function standTable(D,rows,limit){
  const r=limit?rows.slice(0,limit):rows;
  return '<div class="scroll"><table class="stand"><thead><tr><th></th><th>Team</th>'
   +'<th class="num">Record</th><th class="num">PF</th><th class="num">PA</th>'
   +'<th class="num">Avg</th><th class="num">Won</th></tr></thead><tbody>'
   +r.map((x,i)=>'<tr><td class="rk">'+(i+1)+'</td>'
     +'<td><span class="tmc">'+B.avatar(D.AVT[x.t])+'<span class="tn2">'+esc(x.t)+'</span></span></td>'
     +'<td class="num b">'+x.w+'-'+x.l+(x.tie?'-'+x.tie:'')+'</td>'
     +'<td class="num">'+f1(x.pf)+'</td><td class="num dim">'+f1(x.pa)+'</td>'
     +'<td class="num">'+f1(x.pf/x.scores.length)+'</td>'
     +'<td class="num b">$'+(x.high*B.WKPAY)+'</td></tr>').join('')
   +'</tbody></table></div>';
}

/* ---------- head to head ----------
   One starting slot per row: his player on the left, the other on the right,
   so a whole matchup reads down a single column of slot labels. */
function cell(id,pts,ctx,right){
  const cls=['c',right?'them':'me'];
  let sub='', val='';
  if(!id) return '<div class="'+cls.join(' ')+'"><span class="bar"></span>'
    +'<div class="t"><span class="nm dim">Empty</span></div></div>';
  if(ctx){
    const st=B.slotState(id,pts,ctx);
    if(st.state==='in') cls.push('live'); else if(st.state==='post') cls.push('done');
    else if(st.state==='pre') cls.push('pre');
    if(st.rz) cls.push('rz');
    sub='<span class="sub">'+B.logo(B.tm(id))+'<span>'+esc(B.gameLine(id,pts,ctx))+'</span></span>';
    val='<div class="v"><b>'+(st.state==='pre'?'--':f1(pts))+'</b><small>'+f1(st.proj)+'</small></div>';
  }else{
    sub='<span class="sub">'+B.logo(B.tm(id))+'<span>'+esc(B.pos(id))+'</span></span>';
    val='<div class="v"><b>'+f1(pts)+'</b></div>';
  }
  const ij=B.inj(id);
  return '<div class="'+cls.join(' ')+'" style="'+B.paint(B.tm(id))+'"><span class="bar"></span>'
    +B.head(id,'sm')
    +'<div class="t"><span class="nm"><span class="pn">'+esc(shortName(id))+'</span>'
    +(ij?'<span class="inj">'+esc(ij.slice(0,3).toUpperCase())+'</span>':'')+'</span>'+sub+'</div>'
    +val+'</div>';
}
const SUF=/^(jr\.?|sr\.?|ii|iii|iv|v)$/i;
function shortName(id){
  const n=B.nm(id);
  if(B.pos(id)==='DST') return n;
  const w=String(n).split(' ').filter(x=>!SUF.test(x));
  return w.length>1?w[0][0]+'. '+w.slice(1).join(' '):n;
}
function h2h(g,slots,ctx){
  const la=(g.ea.starters||[]), lb=(g.eb.starters||[]);
  const pa=g.ea.players_points||{}, pb=g.eb.players_points||{};
  const n=Math.max(la.length,lb.length,slots.length);
  let out='<div class="h2h"><div class="r hd"><span class="c">'+esc(g.a)+'</span>'
    +'<span class="mid">PTS</span><span class="c them">'+esc(g.b)+'</span></div>';
  for(let i=0;i<n;i++){
    const A=la[i]&&la[i]!=='0'?la[i]:null, Bd=lb[i]&&lb[i]!=='0'?lb[i]:null;
    const sl=B.SLAB[slots[i]]||slots[i]||'';
    out+='<div class="r">'+cell(A,A?(pa[A]||0):0,ctx,false)
      +'<span class="mid">'+esc(sl)+'</span>'+cell(Bd,Bd?(pb[Bd]||0):0,ctx,true)+'</div>';
  }
  out+='<div class="r ft"><span class="c"><span class="tl">Total</span>'
    +'<span class="tot'+(g.pa<g.pb?' trail':'')+'">'+f1(g.pa)+'</span></span>'
    +'<span class="mid"></span>'
    +'<span class="c them"><span class="tot'+(g.pb<g.pa?' trail':'')+'">'+f1(g.pb)+'</span>'
    +'<span class="tl">Total</span></span></div></div>';
  return out;
}

/* ---------- one matchup ----------
   live: projected finish and win probability ride along. A finished week only
   gets the score and the margin - there is nothing left to project. */
function matchCard(D,g,ctx,live){
  // name over record over score, so a long Sleeper handle is never clipped
  const side=(name,score,other,right)=>
    '<div class="side'+(right?' r':'')+'">'
    +'<div class="idr">'+B.avatar(D.AVT[name])+'<span class="n">'+esc(name)+'</span></div>'
    +rec(D,name)
    +'<span class="sc'+(round1(score)<round1(other)?' trail':'')+'">'+f1(score)+'</span></div>';
  let mid='<span class="vs">VS</span>', extra='';
  if(live&&ctx){
    const A=B.summarize((g.ea.starters||[]).filter(x=>x&&x!=='0'),g.ea.players_points||{},ctx);
    const Bs=B.summarize((g.eb.starters||[]).filter(x=>x&&x!=='0'),g.eb.players_points||{},ctx);
    const anyLive=A.live+Bs.live>0;
    // A tag only when it carries something: LIVE, or FINAL. Nothing before
    // kickoff - two zeroes already say the week has not started.
    if(anyLive) mid='<span class="tag live">Live</span>';
    else if(A.yet+Bs.yet===0) mid='<span class="tag final">Final</span>';
    const wp=B.winProb(A,Bs);
    // Nothing left to play: the margin is the story, not a probability.
    if(A.yet+Bs.yet===0) return card(D,g,mid,margin(g));
    extra='<div class="proj"><span>proj finish <b>'+f1(A.projFinal)+'</b></span><span></span>'
      +'<span class="r">proj finish <b>'+f1(Bs.projFinal)+'</b></span></div>'
      +'<div class="wp"><div class="lab"><span>'+esc(g.a)+' win probability, est.</span>'
      +'<b>'+Math.round(wp*100)+'%</b></div>'
      +'<div class="wpbar"><i style="width:'+Math.round(wp*100)+'%"></i><i></i></div>'
      +'<div class="left"><span><b>'+A.yet+'</b> of '+A.n+' yet to play</span>'
      +'<span><b>'+Bs.yet+'</b> of '+Bs.n+' yet to play</span></div></div>';
  }else{
    extra=margin(g);
  }
  return card(D,g,mid,extra);

  function card(D,g,mid,extra){
    return '<details class="mc" data-k="'+esc(g.a)+'"><summary><div class="top">'
      +side(g.a,g.pa,g.pb,false)+mid+side(g.b,g.pb,g.pa,true)+'</div>'+extra
      +'<div class="open"><span class="more">Lineups</span><span class="less">Hide lineups</span></div>'
      +'</summary>'+h2h(g,D.slots,live?ctx:null)+'</details>';
  }
}
function margin(g){
  const w=g.pa>g.pb?g.a:g.b;
  return '<div class="proj"><span>'+esc(w)+' by <b>'+f1(marg(g.pa,g.pb))+'</b></span>'
    +'<span></span><span class="r"></span></div>';
}
function rec(D,name){
  const r=D._rec&&D._rec[name];
  if(!r||!r.scores.length) return '';
  return '<span class="rec">'+r.w+'-'+r.l+(r.tie?'-'+r.tie:'')+'</span>';
}

/* ---------- the NFL slate ----------
   Every game on the board: logos, score, clock, who has the ball and whether
   they are in the red zone. Live games first, then what has not kicked off,
   then the finals. */
function gameChip(g){
  const cls=['game'];
  if(g.state==='in') cls.push('live');
  if(g.state==='in'&&g.redzone) cls.push('rz');
  const side=(ab,score,other)=>{
    const trail=g.state!=='pre'&&score<other;
    const ball=g.state==='in'&&g.possession===ab
      ? '<span class="poss">'+(g.redzone?'RED ZONE':'BALL')+'</span>' : '';
    return '<div class="t'+(trail?' trail':'')+'"><span class="ab">'+B.logo(ab,'lg')
      +'<span>'+esc(ab)+'</span>'+ball+'</span>'
      +'<span class="s">'+(g.state==='pre'?'':score)+'</span></div>';
  };
  let st;
  if(g.state==='in') st='<span class="tag live">Live</span><span class="clk">'+esc(g.detail)+'</span>';
  else if(g.state==='post') st='<span class="tag final">Final</span>';
  else st='<span>'+esc(B.kick(g.kickoff))+'</span>'
    +(g.broadcast?'<span class="tv">'+esc(g.broadcast)+'</span>':'');
  return '<div class="'+cls.join(' ')+'" style="'+B.paint(g.away)+';--to:'
    +((B.TEAMS[g.home]||{}).p||'#777')+'">'
    +side(g.away,g.awayScore,g.homeScore)+side(g.home,g.homeScore,g.awayScore)
    +'<div class="st">'+st+'</div>'
    +(g.state==='in'&&g.down?'<div class="st sub">'+esc(g.down)+'</div>':'')
    +'</div>';
}

/* ---------- weekly recap ----------
   Written from the week's own numbers. Every line is traceable to something
   printed on this page, and the language scales to the margin: a nine point
   win is not a beating. */
const VERB=m=>m<5?'edged':m<15?'beat':m<30?'handled':'buried';
const SKILL=['QB','RB','WR','TE'];

// What each team started against the best legal lineup it was holding.
function benchReport(D,games){
  const out=[];
  games.forEach(g=>{
    [[g.ea,g.a],[g.eb,g.b]].forEach(pairT=>{
      const e=pairT[0], t=pairT[1];
      const pp=e.players_points||{};
      const ids=(e.players||[]).filter(Boolean);
      const st=(e.starters||[]).filter(id=>id&&id!=='0');
      const act=st.reduce((s,id)=>s+(pp[id]||0),0);
      const best=B.bestLineup(ids,pp,D.slots).total;
      const bench=ids.filter(id=>st.indexOf(id)<0);
      let tb=null;
      bench.forEach(id=>{ if(tb===null||(pp[id]||0)>(pp[tb]||0)) tb=id; });
      out.push({t:t,act:act,best:best,
        left:Math.max(0,round1(best)-round1(act))/10,   // off the printed numbers
        tb:tb,tbp:tb?(pp[tb]||0):0});
    });
  });
  return out.sort((a,b)=>b.left-a.left);
}
// Season lines: the money, the leader, and any streak worth naming.
function seasonLines(D,S){
  const out=[];
  const earn={}; S.rows.forEach(r=>{ earn[r.t]=r.high*B.WKPAY; });
  const paid=S.rows.reduce((a,r)=>a+r.high*B.WKPAY,0);
  const won=Object.keys(earn).filter(t=>earn[t]>0).sort((a,b)=>earn[b]-earn[a]);
  if(won.length) out.push(['Money so far',
    won.map(t=>t+' $'+earn[t]).join(', ')+'. $'+paid+' of $'+(B.WKPAY*B.C.regWeeks)+' paid out']);
  const seq={}; Object.keys(S.rec).forEach(t=>{ seq[t]=[]; });
  S.weekly.forEach(w=>w.games.forEach(g=>{
    if(round1(g.pa)===round1(g.pb)){ seq[g.a].push('T'); seq[g.b].push('T'); return; }
    const up=g.pa>g.pb?g.a:g.b, dn=g.pa>g.pb?g.b:g.a;
    if(seq[up]) seq[up].push('W');
    if(seq[dn]) seq[dn].push('L');
  }));
  const run=t=>{
    const s=seq[t]||[]; if(s.length<3) return null;
    const c=s[s.length-1]; let n=0;
    for(let i=s.length-1;i>=0&&s[i]===c;i--) n++;
    return (n>=3&&c!=='T')?[c,n]:null;
  };
  const lead=S.rows[0];
  if(lead){
    // the leader's own streak rides in his clause; nobody is named twice
    const lr=run(lead.t);
    const runs=Object.keys(seq).filter(t=>t!==lead.t).map(t=>[t,run(t)]).filter(r=>r[1])
      .map(r=>r[0]+' has '+(r[1][0]==='W'?'won':'lost')+' '+r[1][1]+' straight');
    out.push(['Standings',lead.t+' leads at '+lead.w+'-'+lead.l+(lead.tie?'-'+lead.tie:'')
      +' on '+f1(lead.pf)+' points'
      +(lr?', '+(lr[0]==='W'?'winning':'losing')+' the last '+lr[1]:'')
      +(runs.length?'. '+runs.join(', '):'')]);
  }
  return out;
}
function recap(D,S){
  if(!S.weekly.length) return '';
  const x=S.weekly[S.weekly.length-1];
  const gs=x.games;
  if(!gs.length) return '';
  const mar=g=>marg(g.pa,g.pb);
  const won=g=>g.pa>g.pb?[g.a,g.pa,g.b,g.pb]:[g.b,g.pb,g.a,g.pa];
  const spread=gs.slice().sort((a,b)=>mar(b)-mar(a));
  const blow=spread[0], close=spread[spread.length-1];
  const bm=mar(blow), cm=mar(close), bw=won(blow), cw=won(close);
  const sc=[]; gs.forEach(g=>{ sc.push([g.pa,g.a]); sc.push([g.pb,g.b]); });
  sc.sort((a,b)=>b[0]-a[0]);
  const hi=sc[0], lo=sc[sc.length-1];

  // every starter in the league this week, best first
  const all=[];
  gs.forEach(g=>[[g.ea,g.a],[g.eb,g.b]].forEach(pairT=>{
    const e=pairT[0], t=pairT[1], pp=e.players_points||{};
    (e.starters||[]).filter(id=>id&&id!=='0').forEach(id=>all.push([pp[id]||0,id,t]));
  }));
  all.sort((a,b)=>b[0]-a[0]);
  const best=all[0];
  const busts=all.filter(p=>SKILL.indexOf(B.pos(p[1]))>=0&&p[0]<5).slice(-3).reverse();

  let lead='<b>'+esc(hi[1])+'</b> put up '+f1(hi[0])+' to take the weekly money.';
  if(bm<5) lead+=' Nobody won by more than '+f1(bm)+' all week, and the widest of them was '
    +esc(bw[0])+' over '+esc(bw[2])+'.';
  else {
    lead+=' '+esc(bw[0])+' '+VERB(bm)+' '+esc(bw[2])+' by '+f1(bm)+', the widest of the week';
    // "edged" only while it was actually close; a 14 point closest game is not edged
    lead+=(gs.length>1&&close!==blow)
      ?', and '+esc(cw[0])+' '+(cm<8?'edged':VERB(cm))+' '+esc(cw[2])+' by '+f1(cm)+'.':'.';
  }

  const board=gs.slice().sort((a,b)=>Math.max(b.pa,b.pb)-Math.max(a.pa,a.pb)).map(g=>{
    const q=won(g);
    return '<tr><td class="l tm">'+esc(q[0])+'</td><td class="num b">'+f1(q[1])+'</td>'
      +'<td class="num dim">'+f1(q[3])+'</td><td class="l">'+esc(q[2])+'</td></tr>';}).join('');

  const opt=benchReport(D,gs);
  const bench='<div class="scroll"><table class="recap"><thead><tr><th class="l">Team</th>'
    +'<th class="num">Started</th><th class="num">Best</th><th class="num">Left</th>'
    +'</tr></thead><tbody>'+opt.map(o=>'<tr><td class="l tm">'+esc(o.t)+'</td>'
    +'<td class="num">'+f1(o.act)+'</td><td class="num dim">'+f1(o.best)+'</td>'
    +'<td class="num b">'+f1(o.left)+'</td></tr>').join('')+'</tbody></table></div>';

  const lines=[['High score',hi[1]+' at '+f1(hi[0])+', worth $'+B.WKPAY],
    ['Low score',lo[1]+' at '+f1(lo[0])]];
  if(best) lines.push(['Top scorer',B.nm(best[1])+' ('+best[2]+') with '+f1(best[0])]);
  const worst=opt[0];
  if(worst&&worst.left>0) lines.push(['Left on the bench',
    worst.t+' left '+f1(worst.left)+(worst.tb?', with '+B.nm(worst.tb)+' scoring '
      +f1(worst.tbp)+' from the bench':'')]);
  if(busts.length) lines.push(['Started and forgot to score',
    busts.map(b=>B.nm(b[1])+' '+f1(b[0])+' ('+b[2]+')').join(', ')]);
  seasonLines(D,S).forEach(l=>lines.push(l));

  return '<h2>Week '+x.week+' recap</h2><div class="card">'
    +'<p class="rlead">'+lead+'</p>'
    +'<div class="scroll"><table class="recap"><thead><tr><th class="l">Winner</th>'
    +'<th class="num">Score</th><th class="num">Opp</th><th class="l">Loser</th>'
    +'</tr></thead><tbody>'+board+'</tbody></table></div>'
    +'<h4 class="mt">What everyone left on the bench</h4>'+bench
    +'<div class="rlines">'+lines.map(l=>'<div class="rl"><span class="rll">'+esc(l[0])
      +'</span><span class="rlv">'+esc(l[1])+'</span></div>').join('')+'</div></div>';
}
// The kickoff date comes from Sleeper, not from a constant that goes stale
// the moment the schedule shifts.
function EMPTY(D){
  const d=D&&D.state&&D.state.season_start_date;
  const when=d?new Date(d+'T12:00:00Z').toLocaleDateString('en-US',
    {weekday:'long',month:'long',day:'numeric',timeZone:'UTC'}):null;
  return '<div class="empty"><strong>Nothing to show yet</strong>'
    +(when?'Week 1 kicks off '+when+'. ':'')
    +'This fills in on its own as games are played.</div>';
}

window.RENDER={
 _card:matchCard,
 async nfl(){
  const el=$('#nflWrap');
  try{
    const g=await B.games();
    const list=g.list||[];
    if(!list.length){ el.innerHTML='<div class="empty"><strong>No games on the board</strong>'
      +'The NFL scoreboard is empty right now.</div>'; return; }
    const live=list.filter(x=>x.state==='in').length;
    const done=list.filter(x=>x.state==='post').length;
    const rank=x=>x.state==='in'?0:x.state==='pre'?1:2;
    const sorted=list.slice().sort((a,b)=>rank(a)-rank(b)||new Date(a.kickoff)-new Date(b.kickoff));
    el.innerHTML='<div class="livehead"><span class="lhl">'
      +'<span class="pill'+(live?' live':'')+'">'+(g.week?'Week '+g.week:'This week')+'</span>'
      +'<span class="lhr">'+live+' live, '+done+' final, '+list.length+' games</span></span></div>'
      +'<div class="games">'+sorted.map(gameChip).join('')+'</div>';
  }catch(e){ B.err(el,'Cannot reach the NFL scoreboard'); }
 },
 async home(){
  const el=$('#standWrap'), rl=$('#recapWrap');
  try{
    const D=await B.load(), S=B.standings(D); D._rec=S.rec;
    el.innerHTML=S.rows.length?standTable(D,S.rows,8):EMPTY(D);
    rl.innerHTML=recap(D,S);
    const wc=$('#wkCount'); if(wc) wc.textContent=S.weekly.length+' of '+B.C.regWeeks+' weeks played';
  }catch(e){ B.err(el); }
 },
 async standings(){
  const el=$('#standWrap');
  try{
    const D=await B.load(), S=B.standings(D); D._rec=S.rec;
    if(!S.rows.length){ el.innerHTML=EMPTY(D); return; }
    const avg=S.rows.slice().sort((a,b)=>(b.pf/b.scores.length)-(a.pf/a.scores.length));
    const earn={}; S.rows.forEach(r=>earn[r.t]=r.high*B.WKPAY);
    const paid=Object.values(earn).reduce((a,b)=>a+b,0);
    el.innerHTML='<h2>By record</h2>'+standTable(D,S.rows)
      +'<h2>By scoring average</h2><div class="scroll"><table class="stand"><thead><tr><th></th>'
      +'<th>Team</th><th class="num">Avg</th><th class="num">Best</th><th class="num">Worst</th>'
      +'</tr></thead><tbody>'+avg.map((x,i)=>'<tr><td class="rk">'+(i+1)+'</td>'
      +'<td><span class="tmc">'+B.avatar(D.AVT[x.t])+'<span class="tn2">'+esc(x.t)+'</span></span></td>'
      +'<td class="num b">'+f1(x.pf/x.scores.length)+'</td>'
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
      +'<td><span class="tmc">'+B.avatar(D.AVT[e[0]])+'<span class="tn2">'+esc(e[0])+'</span></span></td>'
      +'<td class="num b">$'+e[1]+'</td>'
      +'<td class="num dim">'+(e[1]/B.WKPAY)+'</td></tr>').join('')
      +'</tbody></table></div></details>';
  }catch(e){ B.err(el); }
 },
 async teams(){
  const el=$('#teamsWrap');
  try{
    const D=await B.load(), S=B.standings(D); D._rec=S.rec;
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
      const starters=(x.r.starters||[]).filter(id=>id&&id!=='0');
      const filled=starters.length===D.slots.length
        ? D.slots.map((s,k)=>[B.SLAB[s]||s,starters[k]])
        : B.fillSlots(ids,D.slots).out.map(o=>[B.SLAB[o[0]]||o[0],o[1]]);
      const used=new Set(filled.map(f=>f[1]));
      const bench=ids.filter(id=>!used.has(id));
      const row=(slot,id,dim)=>'<tr><td class="slot'+(dim?' dim':'')+'">'+esc(slot)+'</td>'
        +'<td class="l"><span class="pl">'+(id?B.head(id,'sm'):'')
        +'<span class="pn">'+esc(id?B.nm(id):'empty')
        +(id&&B.inj(id)?'<span class="inj">'+esc(B.inj(id).slice(0,4).toUpperCase())+'</span>':'')
        +'</span></span></td>'
        +'<td class="pp">'+esc(B.pos(id))+'</td>'
        +'<td>'+(id&&B.tm(id)?B.logo(B.tm(id)):'<span class="pp dim">FA</span>')+'</td>'
        +'<td class="num'+(dim?' dim':' b')+'">'+(pts[id]!==undefined?f1(pts[id]):(nwk?'0.0':'-'))+'</td>'
        +'<td class="num'+(dim?' dim':'')+'">'+(nwk?f1((pts[id]||0)/nwk):'-')+'</td></tr>';
      const r=S.rec[x.t];
      const sub=r&&r.scores.length
        ? '<span class="pill">'+r.w+'-'+r.l+'</span><span class="sma">'
          +f1(r.pf/r.scores.length)+' avg</span>' : '';
      return '<details class="fold"><summary><span class="tr">'+(i+1)+'</span>'
        +B.avatar(D.AVT[x.t])+'<span class="tn">'+esc(x.t)+'</span>'+sub+'</summary>'
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
    const D=await B.load(), S=B.standings(D); D._rec=S.rec;
    if(!S.weekly.length){ el.innerHTML=EMPTY(D); return; }
    el.innerHTML=S.weekly.slice().reverse().map(x=>
      '<details class="wk"><summary><span class="wkh">Week '+x.week+'</span>'
      +'<span class="wkhi"><span class="pill">High score</span>'
      +'<b class="wkn">'+esc(x.hi[0])+'</b><span class="wkp">'+f1(x.hi[1])+'</span>'
      +'<span class="wkd">$'+B.WKPAY+'</span></span></summary>'
      +'<div class="wkbody">'+x.games.map(g=>matchCard(D,g,null,false)).join('')+'</div></details>').join('');
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
          adds:Object.keys(t.adds||{}),drops:Object.keys(t.drops||{}),
          created:t.created});
      });
    }
    items.sort((a,b)=>b.created-a.created);
    const label={waiver:'Waiver',free_agent:'Free agent',trade:'Trade'};
    const plist=ids=>ids.length?ids.map(id=>'<span class="pl">'+B.head(id,'sm')
      +'<span class="pn">'+esc(B.nm(id))+'</span></span>').join('') : '<span class="dim">-</span>';
    const budgets='<div class="scroll"><table class="stand"><thead><tr><th></th><th>Team</th>'
      +'<th class="num">Spent</th><th class="num">Left</th></tr></thead><tbody>'
      +Object.entries(spent).sort((a,b)=>b[1]-a[1]).map((e,i)=>'<tr><td class="rk">'+(i+1)+'</td>'
      +'<td><span class="tmc">'+B.avatar(D.AVT[e[0]])+'<span class="tn2">'+esc(e[0])+'</span></span></td>'
      +'<td class="num b">$'+e[1]+'</td>'
      +'<td class="num">$'+(budget-e[1])+'</td></tr>').join('')+'</tbody></table></div>';
    const rows=items.length? items.map(t=>'<tr><td class="num dim">'+t.week+'</td>'
      +'<td class="pp">'+esc(label[t.type]||t.type)+'</td>'
      +'<td class="l tm">'+esc(t.team)+'</td>'
      +'<td class="l">'+plist(t.adds)+'</td>'
      +'<td class="l dim">'+plist(t.drops)+'</td>'
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
