/* Boats And Bros - everything on this site is computed in the reader's browser
   straight from Sleeper's public API. No server, no scheduled build, nothing to
   keep running. Whoever opens a page pulls the current numbers themselves. */
(function(){
const C=window.CFG, PL=window.PL||{};
const LG=C.league, API='https://api.sleeper.app/v1/';
const M=C.money, WKPAY=M.weekly_pool, POT=M.entry*M.teams;
const SLOTS=C.slots;
const SLAB={SUPER_FLEX:'SFLX'};
const ELIG={QB:['QB'],RB:['RB'],WR:['WR'],TE:['TE'],K:['K'],DEF:['DEF'],
  FLEX:['RB','WR','TE'],SUPER_FLEX:['QB','RB','WR','TE'],REC_FLEX:['WR','TE']};
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const nm=id=>(PL[id]&&PL[id][0])||id;
const pos=id=>(PL[id]&&PL[id][1])||'';
const tm=id=>(PL[id]&&PL[id][2])||'';
const f1=v=>(Math.round(v*10)/10).toFixed(1);
async function j(u){const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw new Error(u+' '+r.status);return r.json();}

let CACHE=null;
async function load(){
  if(CACHE) return CACHE;
  const [state,users,rosters]=await Promise.all([
    j(API+'state/nfl'), j(API+'league/'+LG+'/users'), j(API+'league/'+LG+'/rosters')]);
  const UN={}; users.forEach(u=>UN[u.user_id]=u.display_name);
  const RT={}, ROS={};
  rosters.forEach(r=>{ RT[r.roster_id]=UN[r.owner_id]||('roster '+r.roster_id); ROS[r.roster_id]=r; });
  const week=state.display_week||state.week||1;
  // every week that has actually been scored
  const weeks=[];
  for(let w=1;w<=Math.min(C.regWeeks,week);w++){
    let m; try{ m=await j(API+'league/'+LG+'/matchups/'+w);}catch(e){break;}
    if(!m||!m.some(x=>(x.points||0)>0)) break;
    weeks.push({week:w,raw:m});
  }
  CACHE={state,week,UN,RT,ROS,rosters,weeks};
  return CACHE;
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
function fillSlots(ids){
  const left=ids.slice().sort((x,y)=>0), out=[];
  const used=new Set();
  SLOTS.forEach(sl=>{
    const ok=ELIG[sl]||['RB','WR','TE'];
    const pick=ids.find(id=>!used.has(id)&&ok.includes(pos(id)));
    if(pick) used.add(pick);
    out.push([sl,pick||null]);
  });
  return {out,used};
}
window.BNB={C,esc,nm,pos,tm,f1,j,API,LG,load,pair,standings,fillSlots,SLOTS,SLAB,WKPAY,POT,M,
  err(el,msg){el.innerHTML='<div class="empty"><strong>'+esc(msg||'Cannot reach Sleeper')+
    '</strong>This page reads live from Sleeper. Refresh in a moment.</div>';},
  wait(el){el.innerHTML='<div class="empty"><strong>Loading</strong>Pulling the latest from Sleeper.</div>';}
};
})();
