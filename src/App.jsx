import { useState, useEffect, useRef } from "react";
import { Upload, ChevronDown, ChevronRight, Trophy, TrendingUp, BarChart3, Calendar, Zap, X, RotateCcw, Check, Minus } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════
//  CHASIN CHEDDAR'S COMMAND CENTER v2
//  3-Model MLB Tracker: MKB · SimpleOdds · Blended · Performance
// ═══════════════════════════════════════════════════════════════════════════

const SOURCES = {
  mkb:        { label: "MKB",        emoji: "🔧", color: "#22d3ee", bg: "rgba(34,211,238,0.06)",  border: "rgba(34,211,238,0.18)" },
  simpleodds: { label: "SimpleOdds", emoji: "📡", color: "#f59e0b", bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.18)" },
  blended:    { label: "Blended",    emoji: "🔀", color: "#22c55e", bg: "rgba(34,197,94,0.06)",   border: "rgba(34,197,94,0.18)" },
};

const GRADE = {
  S: { color: "#f59e0b", emoji: "🔥", bg: "rgba(245,158,11,0.12)" },
  A: { color: "#22c55e", emoji: "✅", bg: "rgba(34,197,94,0.12)" },
  B: { color: "#3b82f6", emoji: "📊", bg: "rgba(59,130,246,0.12)" },
  C: { color: "#6b7280", emoji: "⚠️", bg: "rgba(107,114,128,0.12)" },
};

const LS = "cc-v2-data";
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const fmtDate = (d, s) => { const t = new Date(d+"T12:00:00"); return s ? t.toLocaleDateString("en-US",{month:"short",day:"numeric"}) : t.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}); };
const fmtOdds = v => !v||v===0?"—":v>0?`+${v}`:`${v}`;
const fmtU = u => `${u>=0?"+":""}${u.toFixed(1)}u`;
const nk = s => (s||"").toString().toLowerCase().trim().replace(/[_\s]+/g," ");
const wrColor = r => r>=55?"#22c55e":r>=45?"#f59e0b":"#ef4444";
const uColor = u => u>=0?"#22c55e":"#ef4444";

const calcUnits = picks => {
  let u = 0;
  picks.forEach(p => {
    if (p.hit===true) u += p.best_odds>0 ? p.best_odds/100 : 100/Math.abs(p.best_odds);
    else if (p.hit===false) u -= 1;
  });
  return Math.round(u*10)/10;
};

function detectSource(p) {
  if (p.source==="simpleodds") return "simpleodds";
  if (p.blend_delta||p.blended_grade) return "blended";
  if (p.source==="blended") return "blended";
  return p.source||"mkb";
}

function normHit(h, resolved) {
  if (!resolved) return { hit: null, resolved: false };
  if (h==="win"||h===true) return { hit: true, resolved: true };
  if (h==="loss"||h===false) return { hit: false, resolved: true };
  if (h==="dnp") return { hit: "dnp", resolved: true };
  return { hit: null, resolved: true };
}

// ═══ APP ════════════════════════════════════════════════════════════════════

export default function App() {
  const [picks, setPicks] = useState([]);
  const [tab, setTab] = useState("mkb");
  const [sub, setSub] = useState("picks");
  const [showImport, setShowImport] = useState(false);
  const [toast, setToast] = useState(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS);
      if (raw) setPicks(JSON.parse(raw));
    } catch {}
  }, []);

  // Save to localStorage
  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify(picks)); } catch {}
  }, [picks]);

  const flash = msg => { setToast(msg); setTimeout(()=>setToast(null), 3000); };

  // ── Import ──
  const doImport = raw => {
    try {
      let data = JSON.parse(raw);
      if (!Array.isArray(data)) {
        const flat = [];
        if (typeof data==="object") Object.values(data).forEach(v => { if(Array.isArray(v)) flat.push(...v); });
        data = flat;
      }
      if (!data.length) { flash("No picks found"); return; }

      const existing = [...picks];
      const keys = new Set(existing.map(p => p.id));
      let added=0, updated=0;

      data.forEach(p => {
        const source = detectSource(p);
        const gr = (p.grade||"C").replace(/[🔥✅⚠️📊\s]+/g,"").trim()||"C";
        const { hit, resolved } = normHit(p.hit, p.resolved);
        const id = `${p.date||todayStr()}-${source}-${nk(p.player)}-${nk(p.market)}-${p.line||0}`;

        const pick = {
          id, date: p.date||todayStr(), source, sport: p.sport||"mlb",
          player: p.player||"?", game: p.game||"", game_time: p.game_time||"",
          market: p.market||"", side: p.side||"Over", line: p.line||0,
          best_odds: p.best_odds||0, best_book: p.best_book||"",
          ev: p.ev||0, score: p.score||0, grade: gr,
          list: p.list||(Math.abs(p.best_odds||0)>=300?"lotto":"best_bets"),
          confirmed: p.confirmed||false, hit, resolved,
          actual_stat: p.actual_stat??null,
          blended_grade: p.blended_grade||null, blend_delta: p.blend_delta||null,
          blended_score: p.blended_score||null, opp_pitcher: p.opp_pitcher||"",
        };

        if (keys.has(id)) {
          const idx = existing.findIndex(e => e.id===id);
          if (idx>=0 && pick.resolved && !existing[idx].resolved) {
            existing[idx] = { ...existing[idx], hit: pick.hit, resolved: true, actual_stat: pick.actual_stat };
            updated++;
          } else if (idx>=0 && pick.resolved) {
            existing[idx] = { ...existing[idx], hit: pick.hit, resolved: true, actual_stat: pick.actual_stat };
            updated++;
          }
        } else {
          existing.push(pick);
          keys.add(id);
          added++;
        }
      });

      setPicks(existing);
      const parts = [];
      if (added) parts.push(`${added} added`);
      if (updated) parts.push(`${updated} updated`);
      flash(parts.length ? `Imported: ${parts.join(", ")}` : "No new picks to import");
      setShowImport(false);
    } catch(e) { flash("Invalid JSON"); console.error(e); }
  };

  const resolve = (id, hit) => setPicks(ps => ps.map(p => p.id===id ? {...p, hit, resolved: true} : p));
  const unresolve = id => setPicks(ps => ps.map(p => p.id===id ? {...p, hit: null, resolved: false, actual_stat: null} : p));
  const clearSource = src => { if(confirm(`Clear all ${SOURCES[src].label} picks?`)) setPicks(ps => ps.filter(p => p.source!==src)); };
  const clearAll = () => { if(confirm("Clear ALL picks?")) setPicks([]); };

  const srcPicks = s => picks.filter(p => p.source===s);
  const srcStats = s => {
    const sp = srcPicks(s);
    const res = sp.filter(p => p.resolved&&(p.hit===true||p.hit===false));
    const h = res.filter(p => p.hit===true).length;
    const u = calcUnits(res);
    return { total: sp.length, decided: res.length, hits: h, miss: res.length-h, wr: res.length?Math.round(h/res.length*100):0, u, roi: res.length?Math.round(u/res.length*100):0 };
  };

  return (
    <div style={{ minHeight:"100vh" }}>

      {/* ── HEADER ── */}
      <header style={{ background:"linear-gradient(135deg, #0f0f1a, #1a1a2e)", borderBottom:"1px solid rgba(255,255,255,0.06)", padding:"14px 16px" }}>
        <div style={{ maxWidth:960, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:18, fontWeight:800, letterSpacing:"-0.03em" }}>
              <span style={{ color:"#f59e0b" }}>Chasin Cheddar's</span>{" "}
              <span style={{ color:"#e2e8f0" }}>Command Center</span>
            </div>
            <div className="mono" style={{ fontSize:10, color:"#4a5568", marginTop:2 }}>
              {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}).toUpperCase()}
            </div>
          </div>
          <button onClick={()=>setShowImport(true)} style={S.importBtn}>
            <Upload size={14} /> Import
          </button>
        </div>
      </header>

      {/* ── SOURCE TABS ── */}
      <nav style={{ background:"#0d0d16", borderBottom:"1px solid rgba(255,255,255,0.06)", padding:"0 16px", overflowX:"auto" }}>
        <div style={{ maxWidth:960, margin:"0 auto", display:"flex", gap:0 }}>
          {[...Object.entries(SOURCES), ["performance", { label:"Performance", emoji:"📊", color:"#a78bfa" }]].map(([k, src]) => {
            const count = k!=="performance" ? picks.filter(p=>p.source===k).length : null;
            return (
              <button key={k} onClick={()=>{setTab(k); setSub(k==="performance"?"overview":"picks");}}
                style={{ flex:1, minWidth:0, padding:"11px 6px", background:"none", border:"none", cursor:"pointer",
                  color: tab===k?src.color:"#4a5568", fontWeight: tab===k?700:500, fontSize:11,
                  borderBottom: tab===k?`2px solid ${src.color}`:"2px solid transparent",
                  whiteSpace:"nowrap", transition:"all 0.15s" }}>
                {src.emoji} {src.label}
                {count!=null && count>0 && <span style={{ marginLeft:3, fontSize:9, opacity:0.5 }}>{count}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── SUB TABS (source views only) ── */}
      {tab!=="performance" && (
        <div style={{ background:"#0d0d16", padding:"6px 16px 0" }}>
          <div style={{ maxWidth:960, margin:"0 auto", display:"flex", gap:6 }}>
            {[["picks","Picks"],["history","History"],["stats","Stats"]].map(([k,l]) => (
              <button key={k} onClick={()=>setSub(k)} style={{
                padding:"5px 12px", borderRadius:6, border:"none", cursor:"pointer", fontSize:11, fontWeight:600,
                background: sub===k?"rgba(255,255,255,0.08)":"transparent",
                color: sub===k?"#e2e8f0":"#4a5568",
              }}>{l}</button>
            ))}
          </div>
        </div>
      )}

      {/* ── BODY ── */}
      <main style={{ maxWidth:960, margin:"0 auto", padding:"14px 16px 100px" }}>
        {tab==="performance" ? (
          <PerformanceView picks={picks} srcStats={srcStats} />
        ) : sub==="picks" ? (
          <PicksView picks={srcPicks(tab)} source={tab} resolve={resolve} unresolve={unresolve} />
        ) : sub==="history" ? (
          <HistoryView picks={srcPicks(tab)} source={tab} resolve={resolve} unresolve={unresolve} />
        ) : (
          <StatsView picks={srcPicks(tab)} source={tab} />
        )}
      </main>

      {/* ── IMPORT MODAL ── */}
      {showImport && <ImportModal onImport={doImport} onClose={()=>setShowImport(false)} clearSource={clearSource} clearAll={clearAll} picks={picks} />}

      {/* ── TOAST ── */}
      {toast && (
        <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)",
          background:"#1e293b", color:"#e2e8f0", padding:"10px 20px", borderRadius:10,
          fontSize:13, fontWeight:600, boxShadow:"0 4px 24px rgba(0,0,0,0.5)", zIndex:999,
          border:"1px solid rgba(255,255,255,0.08)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
//  PICKS VIEW — today's (or most recent) picks for a single source
// ═══════════════════════════════════════════════════════════════════════════

function PicksView({ picks, source, resolve, unresolve }) {
  const src = SOURCES[source];
  let showDate = todayStr();
  let day = picks.filter(p => p.date===showDate);

  if (!day.length) {
    const dates = [...new Set(picks.map(p=>p.date))].sort().reverse();
    if (dates.length) { showDate = dates[0]; day = picks.filter(p=>p.date===showDate); }
  }

  if (!day.length) return <Empty emoji={src.emoji} text={`No ${src.label} picks yet`} sub="Import your JSON to get started" />;

  const GO = {S:0,A:1,B:2,C:3};
  const bb = day.filter(p=>p.list==="best_bets").sort((a,b)=>(GO[a.grade]??3)-(GO[b.grade]??3)||b.score-a.score);
  const lot = day.filter(p=>p.list==="lotto").sort((a,b)=>b.score-a.score);
  const isToday = showDate===todayStr();
  const avgEv = day.length ? (day.reduce((s,p)=>s+(p.ev||0),0)/day.length).toFixed(1) : "0";
  const res = day.filter(p=>p.resolved&&(p.hit===true||p.hit===false));
  const dayHits = res.filter(p=>p.hit===true).length;
  const dayU = calcUnits(res);

  return (
    <div>
      {!isToday && <Banner text={`Showing picks from ${fmtDate(showDate)} — no picks imported for today`} />}

      {/* Day summary */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, marginBottom:14 }}>
        <Chip label="Picks" value={day.length} />
        <Chip label="Avg EV" value={`+${avgEv}%`} color="#22c55e" />
        {res.length>0 ? <>
          <Chip label="W-L" value={`${dayHits}-${res.length-dayHits}`} color={wrColor(res.length?Math.round(dayHits/res.length*100):0)} />
          <Chip label="Units" value={fmtU(dayU)} color={uColor(dayU)} />
        </> : <>
          <Chip label="Best Bets" value={bb.length} />
          <Chip label="Lotto" value={lot.length} />
        </>}
      </div>

      {bb.length>0 && <PickTable title={`${src.emoji} Best Bets`} sub={`${bb.length} picks · ${fmtDate(showDate,true)}`} picks={bb} accent={src.color} resolve={resolve} unresolve={unresolve} />}
      {lot.length>0 && <PickTable title="🎰 Lotto Plays" sub="Long shots" picks={lot} accent="#f59e0b" resolve={resolve} unresolve={unresolve} />}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
//  HISTORY VIEW — day-by-day expandable rows
// ═══════════════════════════════════════════════════════════════════════════

function HistoryView({ picks, source, resolve, unresolve }) {
  const src = SOURCES[source];
  const dates = [...new Set(picks.map(p=>p.date))].sort().reverse();
  if (!dates.length) return <Empty emoji={src.emoji} text={`No ${src.label} history`} />;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      {dates.map(d => {
        const dp = picks.filter(p=>p.date===d);
        const res = dp.filter(p=>p.resolved&&(p.hit===true||p.hit===false));
        const h = res.filter(p=>p.hit===true).length;
        return <DayAccordion key={d} date={d} picks={dp} hits={h} decided={res.length} units={calcUnits(res)} resolve={resolve} unresolve={unresolve} accent={src.color} />;
      })}
    </div>
  );
}

function DayAccordion({ date, picks, hits, decided, units, resolve, unresolve, accent }) {
  const [open, setOpen] = useState(false);
  const wr = decided ? Math.round(hits/decided*100) : null;

  return (
    <div style={{ background:"rgba(255,255,255,0.02)", borderRadius:10, overflow:"hidden" }}>
      <div onClick={()=>setOpen(!open)} style={{ padding:"10px 14px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {open ? <ChevronDown size={14} color="#4a5568"/> : <ChevronRight size={14} color="#4a5568"/>}
          <span style={{ fontWeight:600, fontSize:13 }}>{fmtDate(date)}</span>
          <span style={{ fontSize:11, color:"#4a5568" }}>{picks.length} picks</span>
        </div>
        {decided>0 && (
          <div className="mono" style={{ display:"flex", gap:10, fontSize:11, alignItems:"center" }}>
            <span style={{ color:wrColor(wr), fontWeight:700 }}>{wr}%</span>
            <span style={{ color:"#4a5568" }}>{hits}-{decided-hits}</span>
            <span style={{ color:uColor(units), fontWeight:700 }}>{fmtU(units)}</span>
          </div>
        )}
      </div>
      {open && (
        <div style={{ borderTop:"1px solid rgba(255,255,255,0.04)" }}>
          {picks.sort((a,b)=>b.score-a.score).map((p,i) => <PickRow key={p.id} p={p} rank={i+1} resolve={resolve} unresolve={unresolve} />)}
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
//  STATS VIEW — per-source breakdown
// ═══════════════════════════════════════════════════════════════════════════

function StatsView({ picks, source }) {
  const src = SOURCES[source];
  const res = picks.filter(p=>p.resolved&&(p.hit===true||p.hit===false));
  if (!res.length) return <Empty emoji={src.emoji} text={`No resolved ${src.label} picks yet`} sub="Resolve picks or import tracker results" />;

  const hits = res.filter(p=>p.hit===true).length;
  const u = calcUnits(res);
  const wr = Math.round(hits/res.length*100);
  const roi = Math.round(u/res.length*100);

  const bbRes = res.filter(p=>p.list==="best_bets");
  const lotRes = res.filter(p=>p.list==="lotto");

  const byGrade = {};
  ["S","A","B","C"].forEach(g => { const gp = res.filter(p=>p.grade===g); if(gp.length) byGrade[g] = { d:gp.length, h:gp.filter(p=>p.hit===true).length, u:calcUnits(gp) }; });

  const dayMap = {};
  res.forEach(p => { if(!dayMap[p.date]) dayMap[p.date]=[]; dayMap[p.date].push(p); });

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, marginBottom:14 }}>
        <Chip label="Decided" value={res.length} />
        <Chip label="Hit Rate" value={`${wr}%`} color={wrColor(wr)} />
        <Chip label="Units" value={fmtU(u)} color={uColor(u)} />
        <Chip label="ROI" value={`${roi>=0?"+":""}${roi}%`} color={uColor(roi)} />
      </div>

      <Card title={`${src.emoji} By Section`}>
        <Table headers={["Section","Decided","Hit Rate","Units"]} rows={[
          [`${src.emoji} Best Bets`, bbRes.length, bbRes.length?`${Math.round(bbRes.filter(p=>p.hit===true).length/bbRes.length*100)}%`:"—", fmtU(calcUnits(bbRes))],
          ["🎰 Lotto", lotRes.length, lotRes.length?`${Math.round(lotRes.filter(p=>p.hit===true).length/lotRes.length*100)}%`:"—", fmtU(calcUnits(lotRes))],
        ]} />
      </Card>

      <Card title="By Grade">
        <Table headers={["Grade","Decided","Hit Rate","Units"]} rows={
          Object.entries(byGrade).map(([g,d]) => [`${GRADE[g].emoji} ${g}`, d.d, `${Math.round(d.h/d.d*100)}%`, fmtU(d.u)])
        } />
      </Card>

      {source==="blended" && <BlendDelta picks={res} />}

      <Card title="📅 Daily Breakdown">
        <Table headers={["Date","Picks","W-L","Rate","Units"]} rows={
          Object.entries(dayMap).sort((a,b)=>b[0].localeCompare(a[0])).map(([d,dp]) => {
            const h = dp.filter(p=>p.hit===true).length;
            return [fmtDate(d,true), dp.length, `${h}-${dp.length-h}`, `${Math.round(h/dp.length*100)}%`, fmtU(calcUnits(dp))];
          })
        } />
      </Card>
    </div>
  );
}

function BlendDelta({ picks }) {
  const deltas = ["↑ boost","= confirm","= support","= neutral","↓ weak","✗ veto","skip-market","no-match"];
  const rows = deltas.map(d => {
    const b = picks.filter(p=>p.blend_delta===d);
    if(!b.length) return null;
    const h = b.filter(p=>p.hit===true).length;
    return [d, b.length, `${h}-${b.length-h}`, `${Math.round(h/b.length*100)}%`, fmtU(calcUnits(b))];
  }).filter(Boolean);
  if (!rows.length) return null;
  return <Card title="🔀 Blend Filter Effect"><Table headers={["Delta","Total","W-L","Win %","Units"]} rows={rows} /></Card>;
}


// ═══════════════════════════════════════════════════════════════════════════
//  PERFORMANCE VIEW — head-to-head comparison
// ═══════════════════════════════════════════════════════════════════════════

function PerformanceView({ picks, srcStats }) {
  const sources = ["mkb","simpleodds","blended"];
  const data = sources.map(s => ({ key:s, ...SOURCES[s], ...srcStats(s) }));
  const hasData = data.some(d => d.decided>0);

  if (!hasData) return <Empty emoji="📊" text="No resolved picks yet" sub="Import data and resolve picks to compare models" />;

  return (
    <div>
      {/* Hero cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:16 }}>
        {data.map(d => (
          <div key={d.key} style={{ background:d.bg, border:`1px solid ${d.border}`, borderRadius:12, padding:"16px 12px", textAlign:"center" }}>
            <div style={{ fontSize:12, fontWeight:700, color:d.color, marginBottom:6 }}>{d.emoji} {d.label}</div>
            <div style={{ fontSize:30, fontWeight:800, color:d.decided?wrColor(d.wr):"#4a5568", letterSpacing:"-0.03em" }}>
              {d.decided ? `${d.wr}%` : "—"}
            </div>
            <div style={{ fontSize:10, color:"#64748b", marginTop:2 }}>{d.hits}-{d.miss} · {d.decided} decided</div>
            <div className="mono" style={{ fontSize:15, fontWeight:700, marginTop:6, color:d.decided?uColor(d.u):"#4a5568" }}>
              {d.decided ? fmtU(d.u) : "—"}
            </div>
            <div className="mono" style={{ fontSize:10, color:"#4a5568" }}>
              ROI: {d.decided ? `${d.roi>=0?"+":""}${d.roi}%` : "—"}
            </div>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <Card title="🏷️ Head-to-Head">
        <Table headers={["Source","Decided","W-L","Hit Rate","Units","ROI"]} rows={
          data.filter(d=>d.decided>0).map(d => [`${d.emoji} ${d.label}`, d.decided, `${d.hits}-${d.miss}`, `${d.wr}%`, fmtU(d.u), `${d.roi>=0?"+":""}${d.roi}%`])
        } />
      </Card>

      {/* Bar chart */}
      <Card title="📊 Units by Source">
        <div style={{ display:"flex", gap:16, justifyContent:"center", alignItems:"flex-end", height:120, padding:"0 20px" }}>
          {data.filter(d=>d.decided>0).map(d => {
            const mx = Math.max(...data.map(x=>Math.abs(x.u)), 0.1);
            const h = Math.max(8, Math.abs(d.u)/mx*100);
            return (
              <div key={d.key} style={{ textAlign:"center", flex:1 }}>
                <div className="mono" style={{ fontSize:12, fontWeight:700, color:uColor(d.u), marginBottom:4 }}>{fmtU(d.u)}</div>
                <div style={{ height:h, background:d.u>=0?d.color:"#ef4444", borderRadius:"4px 4px 0 0", margin:"0 auto", width:40 }} />
                <div style={{ fontSize:10, color:"#4a5568", marginTop:4 }}>{d.label}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
//  IMPORT MODAL
// ═══════════════════════════════════════════════════════════════════════════

function ImportModal({ onImport, onClose, clearSource, clearAll, picks }) {
  const [text, setText] = useState("");
  const fileRef = useRef();

  const handleFile = f => { if(!f)return; const r=new FileReader(); r.onload=e=>setText(e.target.result); r.readAsText(f); };

  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:16 }}>
      <div style={{ background:"#1a1f2e", borderRadius:16, padding:20, maxWidth:480, width:"100%", maxHeight:"85vh", overflow:"auto", border:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:700 }}>Import Picks</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#4a5568" }}><X size={18}/></button>
        </div>

        <p style={{ fontSize:11, color:"#64748b", margin:"0 0 14px", lineHeight:1.5 }}>
          Drop or paste any picks JSON. Source auto-detected:{" "}
          <span style={{ color:"#22d3ee" }}>picks_log_mlb.json</span> →MKB ·{" "}
          <span style={{ color:"#f59e0b" }}>simpleodds_log_mlb.json</span> →SimpleOdds ·{" "}
          <span style={{ color:"#22c55e" }}>picks_log_mlb_blended.json</span> →Blended
        </p>

        {/* Drop zone */}
        <div onClick={()=>fileRef.current?.click()}
          onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();handleFile(e.dataTransfer.files[0]);}}
          style={{ border:"2px dashed rgba(255,255,255,0.1)", borderRadius:8, padding:18, textAlign:"center", cursor:"pointer", marginBottom:10 }}>
          <Upload size={20} color="#4a5568" style={{ marginBottom:4 }} />
          <div style={{ fontSize:11, fontWeight:600, color:"#64748b" }}>Drop JSON or click to browse</div>
          <input ref={fileRef} type="file" accept=".json" style={{ display:"none" }} onChange={e=>handleFile(e.target.files[0])} />
        </div>

        <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Or paste JSON here..."
          style={{ width:"100%", minHeight:80, background:"rgba(0,0,0,0.3)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:10, color:"#e2e8f0", fontSize:11, fontFamily:"'JetBrains Mono',monospace", resize:"vertical", boxSizing:"border-box" }} />

        <div style={{ display:"flex", gap:8, marginTop:10 }}>
          <button onClick={()=>{if(text.trim())onImport(text);}} style={{ flex:1, background:"#f59e0b", color:"#000", border:"none", borderRadius:8, padding:"9px 14px", fontWeight:700, cursor:"pointer", fontSize:12 }}>Import</button>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.05)", color:"#64748b", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"9px 14px", cursor:"pointer", fontSize:12 }}>Cancel</button>
        </div>

        {/* Data management */}
        {picks.length>0 && (
          <div style={{ marginTop:14, paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize:9, fontWeight:700, color:"#4a5568", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:6 }}>Data Management</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {Object.entries(SOURCES).map(([k,v]) => {
                const n = picks.filter(p=>p.source===k).length;
                return n>0 ? <button key={k} onClick={()=>clearSource(k)} style={S.dangerBtn}>{v.emoji} Clear {v.label} ({n})</button> : null;
              })}
              <button onClick={clearAll} style={S.dangerBtn}>Clear All ({picks.length})</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
//  SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function PickTable({ title, sub, picks, accent, resolve, unresolve }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.02)", borderRadius:10, marginBottom:14, overflow:"hidden" }}>
      <div style={{ padding:"10px 14px", borderBottom:"1px solid rgba(255,255,255,0.04)", borderLeft:`3px solid ${accent}` }}>
        <div style={{ fontWeight:700, fontSize:13 }}>{title}</div>
        {sub && <div style={{ fontSize:10, color:"#4a5568" }}>{sub}</div>}
      </div>
      {picks.map((p,i) => <PickRow key={p.id} p={p} rank={i+1} resolve={resolve} unresolve={unresolve} />)}
    </div>
  );
}

function PickRow({ p, rank, resolve, unresolve }) {
  const isU = (p.side||"").toLowerCase()==="under";
  const g = GRADE[p.grade]||GRADE.C;

  return (
    <div style={{
      padding:"8px 14px", borderBottom:"1px solid rgba(255,255,255,0.025)", display:"flex", alignItems:"center", gap:8, fontSize:12,
      background: p.resolved ? (p.hit===true?"rgba(34,197,94,0.03)":p.hit===false?"rgba(239,68,68,0.03)":"transparent") : "transparent"
    }}>
      {/* Rank */}
      <div style={{ width:24, textAlign:"center", fontWeight:700, fontSize:12, color:rank<=3?"#f59e0b":"#4a5568", flexShrink:0 }}>
        {rank<=3?["🥇","🥈","🥉"][rank-1]:rank}
      </div>

      {/* Player + game */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:600, fontSize:12, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
          {p.player}
          {p.confirmed && <span style={{ marginLeft:4, fontSize:8, background:"rgba(245,158,11,0.15)", color:"#f59e0b", padding:"1px 4px", borderRadius:3, fontWeight:700 }}>CONF</span>}
        </div>
        <div style={{ fontSize:10, color:"#4a5568", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.game||"—"}</div>
      </div>

      {/* Prop */}
      <div style={{ flexShrink:0 }}>
        <span style={{ fontSize:10, fontWeight:600, padding:"2px 6px", borderRadius:4,
          background: isU?"rgba(239,68,68,0.08)":"rgba(34,197,94,0.08)",
          color: isU?"#ef4444":"#22c55e"
        }}>
          {p.market} {isU?"U":"O"} {p.line}
        </span>
      </div>

      {/* Odds */}
      <div className="mono" style={{ width:42, textAlign:"center", fontSize:11, fontWeight:600, flexShrink:0 }}>{fmtOdds(p.best_odds)}</div>

      {/* Grade */}
      <div style={{ width:32, textAlign:"center", flexShrink:0 }}>
        <span style={{ fontSize:10, fontWeight:700, color:g.color }}>{g.emoji}{p.grade}</span>
      </div>

      {/* Result */}
      <div style={{ width:68, textAlign:"center", flexShrink:0 }}>
        {p.resolved ? (
          <div style={{ display:"flex", alignItems:"center", gap:3, justifyContent:"center" }}>
            <span style={{
              fontSize:9, fontWeight:700, padding:"2px 5px", borderRadius:4,
              background: p.hit===true?"rgba(34,197,94,0.12)":p.hit===false?"rgba(239,68,68,0.12)":"rgba(107,114,128,0.12)",
              color: p.hit===true?"#22c55e":p.hit===false?"#ef4444":"#6b7280",
            }}>
              {p.hit===true?"HIT":p.hit===false?"MISS":p.hit==="dnp"?"DNP":"PUSH"}
              {p.actual_stat!=null&&p.actual_stat!=="DNP"?` ${p.actual_stat}`:""}
            </span>
            <button onClick={()=>unresolve(p.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#4a5568", padding:0, lineHeight:1 }}>
              <RotateCcw size={10} />
            </button>
          </div>
        ) : (
          <div style={{ display:"flex", gap:2, justifyContent:"center" }}>
            <button onClick={()=>resolve(p.id,true)} style={S.resolveBtn}><Check size={10} color="#22c55e"/></button>
            <button onClick={()=>resolve(p.id,false)} style={S.resolveBtn}><X size={10} color="#ef4444"/></button>
            <button onClick={()=>resolve(p.id,null)} style={S.resolveBtn}><Minus size={10} color="#6b7280"/></button>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.02)", borderRadius:10, marginBottom:14, overflow:"hidden" }}>
      {title && <div style={{ padding:"10px 14px", fontWeight:700, fontSize:13, borderBottom:"1px solid rgba(255,255,255,0.04)" }}>{title}</div>}
      <div style={{ padding:"10px 14px" }}>{children}</div>
    </div>
  );
}

function Table({ headers, rows }) {
  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
        <thead>
          <tr>{headers.map((h,i) => (
            <th key={i} style={{ padding:"5px 6px", textAlign:i===0?"left":"center", color:"#4a5568", fontWeight:600, fontSize:9, textTransform:"uppercase", letterSpacing:"0.05em", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>{rows.map((row,i) => (
          <tr key={i}>{row.map((cell,j) => {
            const isU = typeof cell==="string"&&(cell.includes("u")||cell.endsWith("%"));
            const pos = typeof cell==="string"&&cell.startsWith("+");
            const neg = typeof cell==="string"&&cell.startsWith("-");
            return <td key={j} style={{
              padding:"6px", textAlign:j===0?"left":"center", fontWeight:j===0?600:isU?700:400,
              fontFamily:isU?"'JetBrains Mono',monospace":"inherit",
              color:pos?"#22c55e":neg?"#ef4444":"#e2e8f0",
              borderBottom:"1px solid rgba(255,255,255,0.025)"
            }}>{cell}</td>;
          })}</tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function Chip({ label, value, color }) {
  return (
    <div style={{ background:"rgba(255,255,255,0.025)", borderRadius:8, padding:"8px 10px", textAlign:"center" }}>
      <div style={{ fontSize:9, color:"#4a5568", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}</div>
      <div style={{ fontSize:16, fontWeight:800, color:color||"#e2e8f0", marginTop:1 }}>{value}</div>
    </div>
  );
}

function Empty({ emoji, text, sub }) {
  return (
    <div style={{ textAlign:"center", padding:"60px 20px", color:"#4a5568" }}>
      <div style={{ fontSize:44, marginBottom:10 }}>{emoji}</div>
      <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>{text}</div>
      {sub && <div style={{ fontSize:12 }}>{sub}</div>}
    </div>
  );
}

function Banner({ text }) {
  return <div style={{ background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.15)", borderRadius:8, padding:"7px 12px", marginBottom:12, fontSize:11, color:"#f59e0b", fontWeight:600 }}>{text}</div>;
}

// ── Inline styles ──
const S = {
  importBtn: { display:"flex", alignItems:"center", gap:6, background:"rgba(245,158,11,0.12)", border:"1px solid rgba(245,158,11,0.25)", color:"#f59e0b", padding:"7px 14px", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:12 },
  resolveBtn: { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:4, cursor:"pointer", padding:"3px 5px", display:"flex", alignItems:"center" },
  dangerBtn: { background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.15)", color:"#ef4444", padding:"5px 10px", borderRadius:6, cursor:"pointer", fontSize:10, fontWeight:600 },
};
