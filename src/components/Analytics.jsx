import React, { useEffect, useMemo, useState, useRef } from "react";
import { X } from "lucide-react";
import supabase from "../../supabaseClient";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { estimate1RM, volumeSeries } from "../utils/fitnessHelpers";
import EXERCISE_MUSCLE_MAP from "../config/muscleMapping";
import { PrimaryButton, SecondaryButton } from "./Button";
import useClickOutside from "../hooks/useClickOutside";

export default function Analytics({ user, onClose }) {
  const [hist, setHist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exerciseList, setExerciseList] = useState([]); // { id, name, muscle_group }
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedRange, setSelectedRange] = useState('4w');
  const [upperThreshold, setUpperThreshold] = useState(20);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // determine start date based on selectedRange
        let query = supabase.from('historial').select('*').eq('user_id', user.id).order('date', { ascending: true });
        if (selectedRange === '4w') {
          const d = new Date();
          d.setDate(d.getDate() - 28);
          const iso = d.toISOString().slice(0, 10);
          query = query.gte('date', iso);
        } else if (selectedRange === '12w') {
          const d = new Date();
          d.setDate(d.getDate() - 84);
          const iso = d.toISOString().slice(0, 10);
          query = query.gte('date', iso);
        }
        const { data: h, error: hErr } = await query;
        if (hErr) throw hErr;
        setHist(h || []);

        // fetch exercises names with muscle_group
        const { data: r, error: rErr } = await supabase.from('rutinas_usuario').select('id,name,muscle_group').eq('user_id', user.id);
        if (rErr) throw rErr;
        const map = (r || []).map(x => ({ id: x.id, name: x.name, muscle_group: x.muscle_group }));
        setExerciseList(map);
        if (map.length && !selectedExercise) setSelectedExercise(map[0].id);
      } catch (e) {
        console.error('Error cargando analíticas', e);
        alert('Error cargando analíticas: ' + (e.message || e));
      } finally {
        setLoading(false);
      }
    };
    if (user) load();
  }, [user, selectedRange]);

  

  const seriesByDate = useMemo(() => {
    if (!selectedExercise) return [];
    // group by date and compute 1RM estimate (max per session) and total session volume
    const byDate = {};
    hist.filter(h => h.exercise_id === selectedExercise).forEach((r) => {
      const d = r.date;
      if (!byDate[d]) byDate[d] = { date: d, volumes: 0, rms: [] };
      const vol = volumeSeries(r);
      byDate[d].volumes += vol;
      const rm = estimate1RM({ weight: r.weight, reps: r.reps, rir: r.rir });
      if (rm) byDate[d].rms.push(rm);
    });
    const arr = Object.values(byDate).sort((a,b)=>a.date<b.date?-1:1).map(d=>({ date: d.date, volume: d.volumes, rm: d.rms.length?Math.max(...d.rms):null }));
    return arr;
  }, [hist, selectedExercise]);

  const weeklyVolumeByMuscle = useMemo(() => {
    // last 7 days (count series per muscle)
    const now = new Date();
    const sevenAgo = new Date(now.getTime() - 6*24*60*60*1000);
    const perMuscle = {};
    hist.forEach(r => {
      const d = new Date(r.date + 'T00:00:00');
      if (d < sevenAgo) return;
      // prefer persisted muscle_group from rutinas_usuario
      const ex = exerciseList.find(x => x.id === r.exercise_id);
      const muscle = ex?.muscle_group || EXERCISE_MUSCLE_MAP[r.exercise_id] || 'Otros';
      perMuscle[muscle] = (perMuscle[muscle] || 0) + 1; // each row = 1 series
    });
    const groups = ['Pecho','Espalda','Hombro','Bíceps','Tríceps','Pierna','Otros'];
    return groups.map(g => {
      const count = perMuscle[g] || 0;
      const color = count < 10 ? '#F59E0B' : (count <= upperThreshold ? '#10B981' : '#EF4444');
      return { muscle: g, count, color, label: `${count} / ${upperThreshold} series` };
    });
  }, [hist, upperThreshold, exerciseList]);

  // Compute a sensible X axis max (at least 25 or 20% above real max)
  const weeklyMax = useMemo(() => {
    if (!weeklyVolumeByMuscle || !weeklyVolumeByMuscle.length) return 25;
    const mx = Math.max(...weeklyVolumeByMuscle.map((w) => w.count || 0));
    return Math.max(25, Math.ceil(mx * 1.2));
  }, [weeklyVolumeByMuscle]);

  // Custom label renderer for bar rows (single tidy label at right)
  const renderBarLabel = (props) => {
    const { x, y, width, height, payload } = props;
    const count = payload?.count ?? payload?.value ?? 0;
    const txt = `${count}/${upperThreshold}`;
    const tx = x + width + 8;
    const ty = y + height / 2 + 4;
    return (
      <text x={tx} y={ty} fill="#9CA3AF" fontSize={12} alignmentBaseline="middle">{txt}</text>
    );
  };

  const xTicks = useMemo(() => {
    const step = Math.ceil(weeklyMax / 4);
    return [0, step, step * 2, step * 3, step * 4];
  }, [weeklyMax]);

  const containerRef = useRef(null);
  useClickOutside(containerRef, onClose, true);

  return (
    <div className="fixed inset-0 z-50 p-0 sm:p-4 flex items-start sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/60" />
      <div ref={containerRef} className="relative bg-[#111214] border border-neutral-800 rounded-none sm:rounded-2xl w-full h-full sm:h-auto sm:max-w-4xl overflow-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">Analíticas & Progreso</h3>
          <button
            type="button"
            onClick={() => onClose && onClose()}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-neutral-800 p-2 text-neutral-300 transition hover:bg-neutral-700 hover:text-white"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm text-neutral-400">Rango</label>
            <div className="inline-flex bg-[#0f1112] rounded-md overflow-hidden">
              {[
                { key: '4w', label: '4 semanas' },
                { key: '12w', label: '12 semanas' },
                { key: 'all', label: 'Histórico' }
              ].map(opt => (
                <button key={opt.key} onClick={() => setSelectedRange(opt.key)} className={`px-3 py-1 text-sm ${selectedRange===opt.key? 'bg-[#1f2937] text-white':'text-neutral-300'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full">
            <label className="text-sm text-neutral-400">Buscar / Ejercicio</label>
            <div className="flex-1">
              <input list="exerciseOptions" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar ejercicio" className="w-full bg-[#121315] p-2 rounded" onBlur={() => {
                // if exact match, select it
                const found = exerciseList.find(ex => ex.name.toLowerCase() === (search || '').toLowerCase());
                if (found) setSelectedExercise(found.id);
              }} />
              <datalist id="exerciseOptions">
                {exerciseList.map(ex => <option key={ex.id} value={ex.name} />)}
              </datalist>
            </div>
            {loading && <div className="text-sm text-neutral-400 mt-1">Cargando datos...</div>}
          </div>

          <div className="col-span-1 sm:col-span-2 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-yellow-400">🟡</span><span className="text-sm text-neutral-300">&lt;10 Bajo</span>
              <span className="text-green-400 ml-3">🟢</span><span className="text-sm text-neutral-300">10-{upperThreshold} Óptimo</span>
              <span className="text-red-400 ml-3">🔴</span><span className="text-sm text-neutral-300">&gt;{upperThreshold} Alto</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <label className="text-sm text-neutral-400">Umbral</label>
              <input className="w-36 sm:w-48" type="range" min={12} max={25} value={upperThreshold} onChange={(e)=>setUpperThreshold(Number(e.target.value))} />
              <div className="text-sm text-neutral-200">{upperThreshold}</div>
                <PrimaryButton className="w-full sm:w-auto ml-3" onClick={() => {
                try {
                  if (!hist || hist.length === 0) { alert('No hay datos en el rango actual'); return; }
                  const header = ['Fecha','Ejercicio','Peso','Reps','RIR','Notas'];
                  const rows = hist.map(r => {
                    const ex = exerciseList.find(x=>x.id===r.exercise_id);
                    return [r.date, ex?.name||r.exercise_id, r.weight, r.reps, r.rir||'', (r.notes||'').replace(/\n/g,' ')];
                  });
                  const csv = [header, ...rows].map(r => r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `historial_${selectedRange || 'all'}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch (err) { console.error(err); alert('Error exportando CSV'); }
                }}>Exportar CSV</PrimaryButton>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="card p-3" style={{ minHeight: 220 }}>
            {seriesByDate.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-neutral-500">Todavía no registraste series de este ejercicio — volvé después de tu próximo entrenamiento para ver tu progreso acá.</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={seriesByDate} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="rm" stroke="#82ca9d" name="1RM Estimado" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="volume" stroke="#8884d8" name="Volumen" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card p-3" style={{ minHeight: 220 }}>
            <h4 className="font-bold mb-2">Volumen semanal por grupo muscular</h4>
            {weeklyVolumeByMuscle.length === 0 ? (
              <div className="text-sm text-neutral-500">No hay datos disponibles.</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weeklyVolumeByMuscle} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, weeklyMax]} ticks={xTicks} />
                  <YAxis type="category" dataKey="muscle" />
                  <Tooltip />
                  <Bar dataKey="count" label={renderBarLabel}>
                    {weeklyVolumeByMuscle.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            <div className="mt-3 text-sm text-neutral-400">Rango óptimo: 10-{upperThreshold} series/semana. <span className="text-yellow-400">&lt;10</span> Bajo • <span className="text-green-400">10-{upperThreshold}</span> Óptimo • <span className="text-red-400">&gt;{upperThreshold}</span> Alto</div>
          </div>
        </div>
      </div>
    </div>
  );
}
