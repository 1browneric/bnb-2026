/* Boats And Bros - everything on this site is computed in the reader's browser
   straight from public APIs. No server, no scheduled build, nothing to keep
   running. Whoever opens a page pulls the current numbers themselves.

   Sleeper  league, rosters, matchups, weekly stats, weekly projections
   ESPN     the NFL scoreboard: kickoff, clock, score, possession, red zone
   Both send access-control-allow-origin: *, need no auth and no key. */
(function(){
const C=window.CFG, PL=window.PL||{}, TEAMS=window.TEAMS||{};
const LG=C.league, API='https://api.sleeper.app/v1/', SLEEPER='https://api.sleeper.app/';
const ESPN='https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
const M=C.money, WKPAY=M.weekly_pool, POT=M.entry*M.teams;
const SLOTS=C.slots;
const SLAB={SUPER_FLEX:'SFLX',DEF:'DST'};
const ELIG={QB:['QB'],RB:['RB'],WR:['WR'],TE:['TE'],K:['K'],DEF:['DEF'],
  FLEX:['RB','WR','TE'],SUPER_FLEX:['QB','RB','WR','TE'],REC_FLEX:['WR','TE']};
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const nm=id=>(PL[id]&&PL[id][0])||id;
const pos=id=>(PL[id]&&PL[id][1])||'';
const tm=id=>(PL[id]&&PL[id][2])||'';
const inj=id=>(PL[id]&&PL[id][3])||'';
const f1=v=>(Math.round(v*10)/10).toFixed(1);
async function j(u){const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw new Error(u+' '+r.status);return r.json();}

/* ---------- team identity ----------
   Colour is identity only. Every state in the UI (live, final, red zone) also
   carries a word or a shape, so nothing depends on telling two colours apart. */
const paint=ab=>{const t=TEAMS[ab];return t?'--tp:'+t.p+';--ts:'+t.s:'--tp:#333;--ts:#777';};
function logo(ab,cls){
  const c='tlogo'+(cls?' '+cls:''), t=TEAMS[ab];
  if(!t) return '<span class="shield'+(cls?' '+cls:'')+'" style="'+paint(ab)+'">'+esc(ab||'?')+'</span>';
  // eager: 32 tiny files the browser caches across every page, and a row that
  // paints without its team logo looks broken for the second it takes to arrive
  return '<img class="'+c+'" src="'+t.logo+'" alt="'+esc(t.name)+'" width="20" height="20"'
    +' decoding="async" data-ab="'+esc(ab)+'" data-cls="'+esc(cls||'')+'"'
    +' onerror="BNB.lfb(this)">';
}
function initials(name){
  return String(name||'?').split(' ').filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase();
}
// Player headshot from Sleeper's CDN, or initials on the team's colours. A
// team defense has no headshot, so it wears its own logo in the circle.
function head(id,cls){
  const c='head'+(cls?' '+cls:''), ab=tm(id)||String(id||'');
  if(!id) return '<span class="'+c+' fb" style="'+paint(ab)+'"></span>';
  if(pos(id)==='DST'||/^[A-Z]{2,3}$/.test(String(id)))
    return '<span class="'+c+' fb" style="'+paint(ab)+'">'+logo(ab)+'</span>';
  return '<img class="'+c+'" src="https://sleepercdn.com/content/nfl/players/thumb/'+encodeURIComponent(id)+'.jpg"'
    +' alt="" loading="lazy" decoding="async" style="'+paint(ab)+'"'
    +' data-i="'+esc(initials(nm(id)))+'" data-cls="'+esc(cls||'')+'" onerror="BNB.hfb(this)">';
}
function lfb(img){                       // logo missing -> coloured shield
  const ab=img.getAttribute('data-ab')||'', cls=img.getAttribute('data-cls')||'';
  const s=document.createElement('span');
  s.className='shield'+(cls?' '+cls:''); s.setAttribute('style',paint(ab)); s.textContent=ab||'?';
  img.replaceWith(s);
}
function hfb(img){                       // headshot missing -> initials
  const cls=img.getAttribute('data-cls')||'';
  const s=document.createElement('span');
  s.className='head fb'+(cls?' '+cls:''); s.setAttribute('style',img.getAttribute('style')||'');
  s.textContent=img.getAttribute('data-i')||'';
  img.replaceWith(s);
}
const avatar=a=>a?'<img class="tav" src="https://sleepercdn.com/avatars/thumbs/'+encodeURIComponent(a)
  +'" alt="" width="26" height="26" loading="lazy" decoding="async">':'<span class="tav"></span>';

let CACHE=null;
async function load(){
  if(CACHE) return CACHE;
  const [state,lg,users,rosters]=await Promise.all([
    j(API+'state/nfl'), j(API+'league/'+LG), j(API+'league/'+LG+'/users'),
    j(API+'league/'+LG+'/rosters')]);
  const UN={}, AV={};
  users.forEach(u=>{UN[u.user_id]=u.display_name; AV[u.user_id]=u.avatar||null;});
  const RT={}, ROS={}, AVT={};
  rosters.forEach(r=>{ RT[r.roster_id]=UN[r.owner_id]||('roster '+r.roster_id);
    ROS[r.roster_id]=r; AVT[RT[r.roster_id]]=AV[r.owner_id]||null; });
  const week=state.display_week||state.week||1;
  const season=state.season;
  // every week that has actually been scored
  const weeks=[];
  for(let w=1;w<=Math.min(C.regWeeks,week);w++){
    let m; try{ m=await j(API+'league/'+LG+'/matchups/'+w);}catch(e){break;}
    if(!m||!m.some(x=>(x.points||0)>0)) break;
    weeks.push({week:w,raw:m});
  }
  // roster_positions is the truth about lineup slots; config.js is the fallback
  const slots=(lg.roster_positions||[]).filter(p=>p!=='BN');
  CACHE={state,season,week,UN,RT,AVT,ROS,rosters,weeks,lg,
    scoring:lg.scoring_settings||null, slots:slots.length?slots:SLOTS};
  return CACHE;
}

/* ---------- the NFL slate (ESPN) ---------- */
let GCACHE=null, GAT=0;
async function games(){
  if(GCACHE && Date.now()-GAT<20000) return GCACHE;
  const byTeam=new Map(), list=[];
  try{
    const d=await j(ESPN);
    (d.events||[]).forEach(ev=>{
      const c=(ev.competitions||[])[0]; if(!c) return;
      const st=c.status||{}, t=st.type||{};
      const home=(c.competitors||[]).find(x=>x.homeAway==='home');
      const away=(c.competitors||[]).find(x=>x.homeAway==='away');
      if(!home||!away) return;
      const H=ab(home.team.abbreviation), A=ab(away.team.abbreviation);
      const period=st.period||0, clock=st.displayClock||'';
      // share of the game already played, for the projected finish
      let elapsed=0;
      if(t.state==='post') elapsed=1;
      else if(t.state==='in'){
        const p=clock.split(':').map(Number);
        const left=isFinite(p[0])?p[0]*60+(p[1]||0):0;
        elapsed=Math.min(1,((Math.min(period,4)-1)*900+(900-left))/3600);
      }
      const s=c.situation||{};
      const g={id:ev.id,kickoff:ev.date,state:t.state,detail:t.shortDetail||'',period,clock,elapsed,
        home:H,away:A,homeScore:Number(home.score||0),awayScore:Number(away.score||0),
        possession:s.possession?(s.possession===home.id?H:A):null,
        redzone:!!s.isRedZone,down:s.downDistanceText||''};
      list.push(g);
      [[H,A,true],[A,H,false]].forEach(function(x){
        const me=x[0],op=x[1],isHome=x[2];
        const c2={}; for(const k in g) c2[k]=g[k];
        c2.team=me; c2.opp=op; c2.isHome=isHome;
        c2.myScore=isHome?g.homeScore:g.awayScore; c2.oppScore=isHome?g.awayScore:g.homeScore;
        byTeam.set(me,c2);
      });
    });
  }catch(e){ /* the scoreboard is decoration; points still render without it */ }
  list.sort((a,b)=>new Date(a.kickoff)-new Date(b.kickoff));
  GCACHE={byTeam,list}; GAT=Date.now();
  return GCACHE;
}
const ALIAS={WSH:'WAS',JAC:'JAX',LA:'LAR',OAK:'LV',SD:'LAC',STL:'LAR'};
function ab(x){const u=(x||'').toUpperCase();return ALIAS[u]||u;}

/* ---------- weekly projections (Sleeper), scored under this league ---------- */
let PCACHE=null, PKEY='';
async function projections(D,week){
  const wk=week||D.week;
  const key=D.season+'-'+wk;
  if(PCACHE&&PKEY===key) return PCACHE;
  try{ const s=sessionStorage.getItem('bnbproj-'+key); if(s){PCACHE=JSON.parse(s);PKEY=key;return PCACHE;} }catch(e){}
  const out={};
  try{
    const sets=D.scoring; if(!sets) throw new Error('no scoring settings');
    const lists=await Promise.all(['QB','RB','WR','TE','K','DEF'].map(p=>
      j(SLEEPER+'projections/nfl/'+D.season+'/'+wk+'?season_type=regular&position[]='+p)
        .catch(()=>[])));
    lists.forEach(rows=>(rows||[]).forEach(row=>{
      if(!row||!row.player_id) return;
      const v=score(row.stats,sets);
      if(v) out[row.player_id]=Math.round(v*100)/100;
    }));
  }catch(e){ /* no projections: the UI drops the projected column, nothing breaks */ }
  PCACHE=out; PKEY=key;
  try{ sessionStorage.setItem('bnbproj-'+key,JSON.stringify(out)); }catch(e){}
  return out;
}
// Sleeper's stat keys line up 1:1 with its scoring keys, so a league's scoring
// is a dot product of its settings and the stat line.
function score(stats,settings){
  if(!stats||!settings) return 0;
  let p=0;
  for(const k in settings){
    const v=stats[k];
    if(typeof v==='number'&&v!==0) p+=v*settings[k];
  }
  return Math.round(p*100)/100;
}

/* ---------- live math ----------
   Projected finish = points already banked + what is left of the projection,
   prorated by how much of his NFL game is still to play. */
function slotState(id,pts,ctx){
  const g=id?ctx.games.byTeam.get(tm(id)):null;
  const proj=id?(ctx.proj[id]||0):0;
  let state=g?g.state:'off';
  // Points on the board beat the scoreboard: if he has already scored, his
  // game is behind us whatever ESPN says (a replayed week, a stale feed).
  const stale=(state==='pre'||state==='off')&&pts>0;
  if(stale) state='post';
  let projFinal;
  if(state==='post') projFinal=pts||0;
  else if(state==='in') projFinal=(pts||0)+proj*(1-g.elapsed);
  else if(state==='pre') projFinal=proj;
  else projFinal=pts||0;
  const rz=!!(g&&state==='in'&&g.redzone&&g.possession===tm(id));
  return {game:g,state,proj,projFinal,rz,stale:stale,
    remain:state==='in'?(1-g.elapsed):state==='pre'?1:0};
}
// Win probability: a logistic on the projected gap, widened by how much
// football is left. Labelled "est." everywhere it appears.
function winProb(a,b){
  const diff=a.projFinal-b.projFinal;
  const unc=8+16*Math.sqrt(((a.remainFrac||0)+(b.remainFrac||0))/2);
  return Math.max(.01,Math.min(.99,1/(1+Math.exp(-diff/unc))));
}
function summarize(ids,pp,ctx){
  const out={pts:0,projFinal:0,live:0,done:0,left:0,remainFrac:0,n:0,rows:[]};
  ids.forEach(id=>{
    const pts=id?(pp[id]||0):0;
    const r=slotState(id,pts,ctx);
    out.rows.push({id:id,pts:pts,r:r});
    out.n++; out.pts+=pts; out.projFinal+=r.projFinal; out.remainFrac+=r.remain;
    if(r.state==='in') out.live++; else if(r.state==='post') out.done++;
    else if(r.state==='pre') out.left++;
  });
  out.remainFrac=out.n?out.remainFrac/out.n:0;
  out.yet=out.live+out.left;
  return out;
}
// One short line of game context for a player: who, when, or the live clock.
function gameLine(id,pts,ctx){
  if(!id) return '';
  const r=slotState(id,pts,ctx), g=r.game;
  if(r.stale) return 'played';
  if(!g) return 'no game';
  const vs=(g.isHome?'vs ':'@ ')+g.opp;   // his own team is the logo beside it
  if(g.state==='in') return vs+' '+g.detail+' '+g.myScore+'-'+g.oppScore+(r.rz?' RED ZONE':'');
  if(g.state==='post') return vs+' final '+g.myScore+'-'+g.oppScore;
  // compact on purpose: these sit two to a row on a phone
  return vs+' '+new Date(g.kickoff).toLocaleString('en-US',
    {weekday:'short',hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'})
    .replace(' AM','a').replace(' PM','p');
}
async function ctx(D,week){
  const g=await games(), p=await projections(D,week);
  return {games:g,proj:p};
}

function pair(raw,RT){
  const by={}; raw.forEach(x=>{(by[x.matchup_id]=by[x.matchup_id]||[]).push(x);});
  return Object.values(by).filter(p=>p.length===2).map(([a,b])=>({
    a:RT[a.roster_id],b:RT[b.roster_id],pa:a.points||0,pb:b.points||0,ea:a,eb:b}));
}
function standings(D){
  const rec={}; Object.values(D.RT).forEach(t=>rec[t]={t,w:0,l:0,tie:0,pf:0,pa:0,high:0,scores:[]});
  const weekly=[];
  D.weeks.forEach(wk=>{
    const gs=pair(wk.raw,D.RT); if(!gs.length) return;
    gs.forEach(g=>{
      [[g.a,g.pa,g.pb],[g.b,g.pb,g.pa]].forEach(([t,p,o])=>{
        const r=rec[t]; if(!r) return;
        r.pf+=p; r.pa+=o; r.scores.push(p);
        if(p>o)r.w++; else if(p<o)r.l++; else r.tie++;
      });
    });
    let hi=null; gs.forEach(g=>{[[g.a,g.pa],[g.b,g.pb]].forEach(([t,p])=>{if(!hi||p>hi[1])hi=[t,p];});});
    if(hi&&rec[hi[0]]) rec[hi[0]].high++;
    weekly.push({week:wk.week,games:gs,hi});
  });
  const rows=Object.values(rec).filter(r=>r.scores.length)
    .sort((a,b)=>(b.w-a.w)||(b.pf-a.pf));
  return {rec,rows,weekly};
}
function fillSlots(ids,slots){
  const use=slots||SLOTS, out=[];
  const used=new Set();
  use.forEach(sl=>{
    const ok=ELIG[sl]||['RB','WR','TE'];
    const pick=ids.find(id=>!used.has(id)&&ok.includes(pos(id)));
    if(pick) used.add(pick);
    out.push([sl,pick||null]);
  });
  return {out,used};
}
window.BNB={C,esc,nm,pos,tm,inj,f1,j,API,LG,load,pair,standings,fillSlots,SLOTS,SLAB,WKPAY,POT,M,
  TEAMS,paint,logo,head,avatar,lfb,hfb,games,projections,ctx,slotState,summarize,winProb,gameLine,
  err(el,msg){el.innerHTML='<div class="empty"><strong>'+esc(msg||'Cannot reach Sleeper')+
    '</strong>This page reads live from Sleeper. Refresh in a moment.</div>';},
  wait(el){el.innerHTML='<div class="empty"><strong>Loading</strong>Pulling the latest from Sleeper.</div>';}
};
})();
