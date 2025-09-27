import React, { useEffect, useMemo, useState } from 'react'

const CATEGORIES = ['Beginner','Scaled','Advance','RX']
const WODS = ['WOD 1','WOD 2','WOD 3','WOD 4','WOD 5']
const STORAGE_KEY = 'athlon-fitfest-data-v2';
const ADMIN_PASSWORD = 'CuloRoto';       // ← cambiala por la que quieras
const ADMIN_SESSION_KEY = 'athlon-admin';  // clave para localStorage


const PRELOADED_TEAMS = [
  // Beginner
  'THE BESTIES','HNAS MACANA','LAS SOTO','DÚO 4.13','DOBLE A','LAS NO REP','LOS SONRIENTES','DOBLE IPA'
].map((n,i)=>({ categoria:'Beginner', id:`BE-${String(i+1).padStart(3,'0')}`, nombre:n })).concat([
  // Scaled
  'MANIJA TEAM','DOBLE IMPACTO','LOS BANDA ROJA (PERO NO TOXICS)','LOS BUBUS','LOS TRAIDORES','Mcpato’s',
  'QUE HACEMOS ACÁ?','QUE NO ME ENCUENTRE SARA','OZZY NO MURIÓ','CUERVOS','EL PRINCESO','VENGO CON EL COLÁGENO',
  'CENTROFIT25','LOS ELITE','PURO CHAMUYO'
].map((n,i)=>({ categoria:'Scaled', id:`SC-${String(i+1).padStart(3,'0')}`, nombre:n }))).concat([
  // Advance
  'TORMENTA TAURO','BLACK & WHITE','CARAS DE PERRO','WODerados','TE FALTA MUCHO? QUIERO ENTRAR','No pain No gain',
  'PAMPAMIX','YIN-YANG','PAMPIS','LITTLE BULLS','METAMORFOS','STAY STRONG','LOS CALESITA','SIN QUEJAS NO HAY ENTRENO',
  'GYM TONIC','FRASCO CHICO','DICLO + PIRIDINOL','HACEMOS LO QUE PODEMOS','CARDIO EN RIESGO','LOS ESCUINCLES'
].map((n,i)=>({ categoria:'Advance', id:`AD-${String(i+1).padStart(3,'0')}`, nombre:n }))).concat([
  // RX
  'LOS RUSOS','PURA GARRA','EMPUJE TEAM','VINCHITAS RX','BURPEANDO ANDO','PAPA Y BATATA','ONICHANS','RAGNAROK','PATI Y MANI'
].map((n,i)=>({ categoria:'RX', id:`RX-${String(i+1).padStart(3,'0')}`, nombre:n })))


function mmssToSeconds(str){ if(!str) return null; const m=str.match(/^(\d{1,2}):(\d{2})$/); if(!m) return null; const mm=+m[1], ss=+m[2]; if(ss>=60) return null; return mm*60+ss; }
function cx(...xs){ return xs.filter(Boolean).join(' ') }
function numOrNull(v){ 
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function compareAsc(a,b){ if(a===null && b===null) return 0; if(a===null) return 1; if(b===null) return -1; return a-b; }
function compareDesc(a,b){ if(a===null && b===null) return 0; if(a===null) return 1; if(b===null) return -1; return b-a; }


function computeRankingForCategory(teams, scores, opts){
  const { wodName, category } = opts;

  const enriched = teams.map(team=>{
    const sc = scores[team.id] || { termino:'', tiempo:'', reps:'', total:'', tb:['','','','','',''] };

    const finished = String(sc.termino).toUpperCase() === 'SI';
    const timeSec  = finished ? mmssToSeconds(sc.tiempo||'') : null;
    const repsNum  = numOrNull(sc.reps);
    const totalNum = numOrNull(sc.total);
    const tbNums   = (Array.isArray(sc.tb) ? sc.tb : []).map(v => mmssToSeconds(v));

    let sortKey;

    if (wodName === 'WOD 2' && category === 'Beginner') {
      // WOD2 – Beginner: mayor TOTAL mejor; empate por TB1..TB6 (menor mejor)
      sortKey = [
        totalNum === null ? -Infinity : -totalNum,
        ...tbNums.map(x => x === null ? Infinity : x)
      ];
    } else if (wodName === 'WOD 2') {
      // WOD2 – Scaled/Advance/RX:
      // 1) Finished primero
      // 2) Entre finished: más reps DESC, luego tiempo ASC, luego TBs ASC
      // 3) Entre NO finished: más reps DESC, luego TBs ASC
      const finishedFlag = finished ? 0 : 1;
      const repsSort = (repsNum === null ? Infinity : -repsNum);
      const timeSort = (finished ? (timeSec ?? Infinity) : Infinity);

      sortKey = finished
        ? [finishedFlag, repsSort, timeSort, ...tbNums.map(x => x === null ? Infinity : x)]
        : [finishedFlag, repsSort, ...tbNums.map(x => x === null ? Infinity : x)];
      } else if (wodName === 'WOD 3') {
  // WOD3 – For Time con tiebreak:
  // 1) Terminó primero
  // 2) Entre terminados: menor tiempo
  // 3) Si sigue el empate: tiebreaks (menor mejor)
  // 4) Entre NO terminados: más reps
  // 5) Si sigue el empate: tiebreaks
  const finishedFlag = finished ? 0 : 1;
  const timeSort = finished ? (timeSec ?? Infinity) : Infinity;
  const repsSort = finished ? 0 : (repsNum===null ? Infinity : -repsNum);

  sortKey = [
    finishedFlag,
    timeSort,
    repsSort,
    ...tbNums.map(x => x === null ? Infinity : x)
  ];
  } else if (wodName === 'WOD 4') {
  // WOD4 – For Time con tiebreak (igual WOD3):
  // 1) Terminó primero
  // 2) Entre terminados: menor tiempo
  // 3) Empate -> TB1..TB6 ASC (MM:SS)
  // 4) Entre NO terminados: más reps
  // 5) Empate -> TB1..TB6 ASC
  const finishedFlag = finished ? 0 : 1;
  const timeSort = finished ? (timeSec ?? Infinity) : Infinity;
  const repsSort = finished ? 0 : (repsNum===null ? Infinity : -repsNum);

  sortKey = [
    finishedFlag,
    timeSort,
    repsSort,
    ...tbNums.map(x => x === null ? Infinity : x)
  ];

} else if (wodName === 'WOD 5') {
  // WOD5 – RM (número): mayor es mejor
  // Solo importa el valor 'rm'. Si querés, luego sumamos tiebreaks secundarios.
  const rmNum = numOrNull(sc.rm);
  sortKey = [
    rmNum === null ? Infinity : -rmNum // DESC (mayor mejor)
  ];

    } else {
      // Otros WODs (ej. WOD1): primero terminados; entre terminados, tiempo ASC; entre no terminados, reps DESC
      const finishedFlag = finished ? 0 : 1;
      sortKey = [
        finishedFlag,
        finished ? (timeSec ?? Infinity) : Infinity,
        finished ? 0 : (repsNum===null ? Infinity : -repsNum)
      ];
    }

    return { team, sc, sortKey };
  });

  enriched.sort((a,b)=>{
    const A = a.sortKey, B = b.sortKey;
    const len = Math.max(A.length, B.length);
    for (let i=0;i<len;i++){
      const av = A[i] ?? 0, bv = B[i] ?? 0;
      if (av < bv) return -1;
      if (av > bv) return 1;
    }
    return 0;
  });

  return enriched.map((row, idx)=>({
    ...row,
    position: idx+1,
    points: idx+1
  }));
}



export default function App(){
const [isAdmin, setIsAdmin] = useState(()=> localStorage.getItem(ADMIN_SESSION_KEY) === '1');
const [tab, setTab] = useState(isAdmin ? 'admin' : 'public');
  const [category, setCategory] = useState('Beginner')
  const [activeWod, setActiveWod] = useState('WOD 1')

const [data, setData] = useState(()=>{
  const makeEmptyRow = () => ({
    termino:'', tiempo:'', reps:'', total:'',
    tb:['','','','','',''],
    rm:''
  });

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);

      // Asegurar estructura base
      if (!parsed.scores) parsed.scores = {};
      WODS.forEach(w => { if (!parsed.scores[w]) parsed.scores[w] = {}; });

      // Partimos de los equipos guardados (si hay), sino lista vacía
      const existingTeams = Array.isArray(parsed.teams) ? parsed.teams.slice() : [];
      const existingById = new Map(existingTeams.map(t => [t.id, t]));

      // 🔧 Agregar equipos nuevos (p.ej. RAGNAROK) y asegurar filas por WOD
      PRELOADED_TEAMS.forEach(t => {
        if (!existingById.has(t.id)) {
          existingTeams.push(t); // agrega RAGNAROK si faltaba
          existingById.set(t.id, t);
        }
        WODS.forEach(w => {
          const row = parsed.scores[w][t.id];
          parsed.scores[w][t.id] = row ? {
            termino: row.termino ?? '',
            tiempo : row.tiempo  ?? '',
            reps   : row.reps    ?? '',
            total  : row.total   ?? '',
            tb     : Array.isArray(row.tb) ? row.tb : ['','','','','',''],
            rm     : row.rm ?? ''
          } : makeEmptyRow();
        });
      });

      return { teams: existingTeams, scores: parsed.scores };
    } catch (e) {
      // si falla el parseo, caemos a estado limpio
    }
  }

  // Estado limpio (primera vez o error en saved)
  const emptyScores = {};
  WODS.forEach(w => emptyScores[w] = {});
  PRELOADED_TEAMS.forEach(t => {
    WODS.forEach(w => {
      emptyScores[w][t.id] = makeEmptyRow();
    });
  });
  return { teams: PRELOADED_TEAMS, scores: emptyScores };
});

function handleAdminClick(){
  if (isAdmin) { setTab('admin'); return; }
  const pass = window.prompt('Clave de administrador:');
  if (pass == null) return;            // canceló
  if (pass === ADMIN_PASSWORD){
    localStorage.setItem(ADMIN_SESSION_KEY, '1');
    setIsAdmin(true);
    setTab('admin');
  } else {
    alert('Clave incorrecta');
  }
}

function logoutAdmin(){
  localStorage.removeItem(ADMIN_SESSION_KEY);
  setIsAdmin(false);
  setTab('public');
}

  useEffect(()=>{ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) },[data])

useEffect(()=>{
  const btnPublic = document.getElementById('btnPublic');
  const btnAdmin  = document.getElementById('btnAdmin');
  const catChips  = document.getElementById('catChips');
  const wodChips  = document.getElementById('wodChips');

  // Botones de modo
  if (btnPublic) btnPublic.onclick = ()=> setTab('public');
  if (btnAdmin)  btnAdmin.onclick  = ()=> handleAdminClick();
  if (btnAdmin) {
    btnAdmin.title = isAdmin ? 'Admin habilitado' : 'Ingresar como admin';
    btnAdmin.textContent = isAdmin ? 'Admin ✅' : 'Admin';
  }

  // ✅ Crear/Quitar botón "Salir" dentro del mismo contenedor del header (a la derecha)
  const btnContainer = btnAdmin?.parentElement; // es el <div> que contiene Público/Admin
  if (btnContainer) {
    let btnLogout = document.getElementById('btnLogout');
    if (isAdmin) {
      if (!btnLogout) {
        btnLogout = document.createElement('button');
        btnLogout.id = 'btnLogout';
        btnLogout.className = 'chip';
        btnLogout.textContent = 'Salir';
        btnLogout.style.marginLeft = '8px';
        btnContainer.appendChild(btnLogout);
      }
      btnLogout.onclick = ()=> logoutAdmin();
    } else {
      if (btnLogout) btnLogout.remove();
    }
  }

  // Chips de categoría
  const renderChips = () => {
    if (catChips) {
      catChips.innerHTML = '';
      CATEGORIES.forEach(c=>{
        const b = document.createElement('button');
        b.className = 'chip' + (c===category? ' active':'');
        b.textContent = c;
        b.onclick = ()=> setCategory(c);
        catChips.appendChild(b);
      });
    }

    if (wodChips) {
      wodChips.innerHTML = '';
      WODS.forEach(w=>{
        const b = document.createElement('button');
        b.className = 'chip' + (w===activeWod ? ' active':'');
        b.textContent = w;
        b.onclick = ()=> setActiveWod(w);
        wodChips.appendChild(b);
      });

      // Botón "RESULTADO TOTAL"
      const r = document.createElement('button');
      r.className = 'chip' + (activeWod === 'RESULTADO TOTAL' ? ' active' : '');
      r.textContent = 'RESULTADO TOTAL';
      r.onclick = ()=> setActiveWod('RESULTADO TOTAL');
      wodChips.appendChild(r);
    }
  };

  renderChips();
}, [activeWod, category, isAdmin, tab]);


  const teamsByCategory = useMemo(()=> data.teams.filter(t=>t.categoria===category), [data.teams, category])
const ranking = useMemo(()=>{
  return computeRankingForCategory(
    teamsByCategory,
    data.scores[activeWod] || {},
    { wodName: activeWod, category }
  );
}, [teamsByCategory, data.scores, activeWod, category]);

  const finalRanking = useMemo(()=>{
  // ¿El WOD tiene algún dato cargado para esta categoría?
  function hasDataForCategory(wodName, teams) {
    const scoresW = data.scores[wodName] || {};
    return teams.some(t => {
      const sc = scoresW[t.id] || {};
      return (
        (sc.termino && String(sc.termino).length) ||
        (sc.tiempo && String(sc.tiempo).length) ||
        (sc.reps !== '' && sc.reps !== undefined && sc.reps !== null) ||
        (sc.total !== '' && sc.total !== undefined && sc.total !== null) ||
        (Array.isArray(sc.tb) && sc.tb.some(v => v !== ''))
      );
    });
  }

  // Solo sumamos los WODs que ya tienen algún dato cargado
  const countedWods = WODS.filter(w => hasDataForCategory(w, teamsByCategory));

  const pointsPerTeam = {};
  teamsByCategory.forEach(team=>{
    let total = 0;
    countedWods.forEach(w=>{
      const r = computeRankingForCategory(
        teamsByCategory,
        data.scores[w],
        { wodName: w, category }
      );
      const found = r.find(x=>x.team.id===team.id);
      if (found && found.points) total += Number(found.points);
    });
    pointsPerTeam[team.id] = total;
  });

  const rows = teamsByCategory.map(team=>({ team, total: pointsPerTeam[team.id] }));
  rows.sort((a,b)=> a.total - b.total);
  return rows.map((r,idx)=> ({...r, position: idx+1 }));
}, [teamsByCategory, data.scores, category]);


  function updateScore(teamId, patch){
  setData(prev => {
    const curWod = prev.scores[activeWod] || {}; // <-- asegura objeto
    const curTeam = curWod[teamId] || { termino:'', tiempo:'', reps:'', total:'', tb:['','','','','',''], rm:'' };

    return {
      ...prev,
      scores: {
        ...prev.scores,
        [activeWod]: {
          ...curWod,
          [teamId]: { ...curTeam, ...patch }
        }
      }
    };
  });
}


return (
  <div> 
    {activeWod !== 'RESULTADO TOTAL' && (
      <section style={{ margin: '16px 0' }}>
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Pos.</th>
                <th>Equipo</th>
                <th className="hide-sm">TeamID</th>
                <th>Terminó</th>
                <th>Tiempo (MM:SS)</th>
                <th>{
                  (activeWod === 'WOD 2' && category === 'Beginner')
                    ? 'Total'
                    : (activeWod === 'WOD 5' ? 'RM' : 'Reps')
                }</th>
                <th>TB1–TB6</th>
                <th>Puntos</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((row, idx) => {
                const sc = (data.scores[activeWod] || {})[row.team.id] || { termino: '', tiempo: '', reps: '', total: '', tb: ['', '', '', '', '', ''], rm: '' };
const editable = tab === 'admin' && isAdmin;

                const isWod2 = activeWod === 'WOD 2';
                const isWod3 = activeWod === 'WOD 3';
                const isWod4 = activeWod === 'WOD 4';
                const isWod5 = activeWod === 'WOD 5';
                const isBeginner = category === 'Beginner';

                const timeInvalid = sc.termino === 'SI' && sc.tiempo && mmssToSeconds(sc.tiempo) == null;

                return (
                  <tr key={row.team.id} style={{ background: idx % 2 ? '#fff' : '#fafafa' }}>
                    {/* Posición, Equipo, TeamID */}
                    <td><span className="badge">#{row.position}</span></td>
                    <td style={{ fontWeight: 500 }}>{row.team.nombre}</td>
                    <td className="hide-sm">{row.team.id}</td>

                    {/* Terminó (deshabilitado en WOD2-Beginner y en WOD5) */}
                    <td>
                      {editable ? (
                        <select
                          className="input"
                          value={sc.termino}
                          onChange={e => updateScore(row.team.id, {
                            termino: e.target.value,
                            tiempo: e.target.value === 'SI' ? sc.tiempo : ''
                          })}
                          disabled={(isWod2 && isBeginner) || isWod5}
                        >
                          <option value="">—</option>
                          <option value="SI">SI</option>
                          <option value="NO">NO</option>
                        </select>
                      ) : (
                        <span>{((isWod2 && isBeginner) || isWod5) ? '—' : (sc.termino || '—')}</span>
                      )}
                    </td>

                    {/* Tiempo */}
                    <td>
                      {editable ? (
                        <input
                          className={'input' + (timeInvalid ? ' invalid' : '')}
                          type="text"
                          placeholder="MM:SS"
                          value={sc.tiempo}
                          onChange={e => updateScore(row.team.id, { tiempo: e.target.value })}
                          disabled={
                            (isWod2 && isBeginner) ? true
                              : (isWod5) ? true
                                : (isWod3 || isWod4) ? false
                                  : (sc.termino !== 'SI')
                          }
                        />
                      ) : (
                        <span>{
                          (isWod2 && isBeginner) || isWod5
                            ? '—'
                            : ((isWod3 || isWod4 || sc.termino === 'SI') ? (sc.tiempo || '—') : '—')
                        }</span>
                      )}
                    </td>

                    {/* Reps / Total / RM */}
                    <td>
                      {editable ? (
                        isWod5 ? (
                          <input
                            className="input"
                            type="number"
                            min={0}
                            step={1}
                            value={sc.rm}
                            onChange={e => updateScore(row.team.id, { rm: e.target.value === '' ? '' : Number(e.target.value) })}
                            placeholder="RM"
                          />
                        ) : (isWod2 && isBeginner) ? (
                          <input
                            className="input"
                            type="number"
                            min={0}
                            step={1}
                            value={sc.total}
                            onChange={e => updateScore(row.team.id, { total: e.target.value === '' ? '' : Number(e.target.value) })}
                            placeholder="Total"
                          />
                        ) : (
                          <input
                            className="input"
                            type="number"
                            min={0}
                            step={1}
                            value={sc.reps}
                            onChange={e => updateScore(row.team.id, { reps: e.target.value === '' ? '' : Number(e.target.value) })}
                            placeholder="Reps"
                            disabled={isWod2 && !isBeginner && sc.termino === ''}
                          />
                        )
                      ) : (
                        <span>
                          {isWod5
                            ? (sc.rm !== '' ? sc.rm : '—')
                            : (isWod2 && isBeginner
                              ? (sc.total !== '' ? sc.total : '—')
                              : (sc.reps !== '' ? sc.reps : '—'))}
                        </span>
                      )}
                    </td>

                    {/* Tiebreaks */}
                    <td>
                      {(isWod2 || isWod3 || isWod4) ? (
                        editable ? (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {(sc.tb || ['', '', '', '', '', '']).map((v, i) => (
                              <input
                                key={i}
                                className={'input' + (v && mmssToSeconds(v) == null ? ' invalid' : '')}
                                type="text"
                                placeholder={`TB${i + 1} (MM:SS)`}
                                value={v}
                                onChange={e => {
                                  const tb = [...(sc.tb || ['', '', '', '', '', ''])];
                                  tb[i] = e.target.value;
                                  updateScore(row.team.id, { tb });
                                }}
                                style={{ width: 80 }}
                              />
                            ))}
                          </div>
                        ) : (
                          <span>
                            {(sc.tb || []).some(x => x !== '')
                              ? (sc.tb || []).map((x, i) => x !== '' ? `TB${i + 1}:${x}` : null).filter(Boolean).join(' · ')
                              : '—'}
                          </span>
                        )
                      ) : '—'}
                    </td>

                    {/* Puntos */}
                    <td>{row.points}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    )}

    {activeWod === 'RESULTADO TOTAL' && (
      <section style={{ margin: '16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '0 4px 8px' }}>
          <div style={{ fontWeight: 600 }}>Ranking Final · {category}</div>
          <div className="mut">Suma de puntos WOD1–WOD4 (menos es mejor)</div>
        </div>
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Pos.</th>
                <th>Equipo</th>
                <th>Total Puntos</th>
              </tr>
            </thead>
            <tbody>
              {finalRanking.map((row, idx) => (
                <tr key={row.team.id} style={{ background: idx % 2 ? '#fff' : '#fafafa' }}>
                  <td><span className="badge">#{row.position}</span></td>
                  <td style={{ fontWeight: 500 }}>{row.team.nombre}</td>
                  <td>{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mut" style={{ marginTop: 8 }}>
          Empates: podemos agregar criterio (más primeros puestos o mejor WOD 4) si querés.
        </div>
      </section>
    )}
  </div>
);
} // ← cierra export default function App()
