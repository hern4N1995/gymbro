import React, { useEffect, useMemo, useState } from "react";
import supabase from "../../supabaseClient";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar, Cell, LabelList } from "recharts";
import { estimate1RM, volumeSeries } from "../utils/fitnessHelpers";
import EXERCISE_MUSCLE_MAP from "../config/muscleMapping";

export default function Analytics({ user, onClose }) {
  const [hist, setHist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exerciseList, setExerciseList] = useState([]); // { id, name, muscle_group }
  const [selectedExercise, setSelectedExercise] = useState(null);
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

  return (
    <div className="fixed inset-0 z-50 p-4 flex items-center justify-center">
      <div className="bg-[#1B1D21] border border-neutral-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">Analíticas / Progreso</h3>
          <button onClick={() => onClose && onClose()}>Cerrar</button>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <div>
            <label className="text-sm text-neutral-400 mr-2">Rango:</label>
            <select value={selectedRange} onChange={(e)=>setSelectedRange(e.target.value)} className="bg-[#121315] p-2">
              <option value="4w">Últimas 4 semanas</option>
              <option value="12w">Últimas 12 semanas</option>
              <option value="all">Histórico Completo</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-neutral-400 mr-2">Ejercicio:</label>
            <select value={selectedExercise||''} onChange={(e)=>setSelectedExercise(e.target.value)} className="bg-[#121315] p-2">
              {exerciseList.map(ex => <option key={ex.id} value={ex.id}>{ex.name || ex.id}</option>)}
            </select>
            {loading && <div className="text-sm text-neutral-400 mt-1">Cargando datos...</div>}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">🟡</span><span className="text-sm text-neutral-300">&lt;10 Bajo</span>
              <span className="text-green-400 ml-3">🟢</span><span className="text-sm text-neutral-300">10-{upperThreshold} Óptimo</span>
              <span className="text-red-400 ml-3">🔴</span><span className="text-sm text-neutral-300">&gt;{upperThreshold} Alto</span>
            </div>
            <div className="ml-4 flex items-center gap-2">
              <label className="text-sm text-neutral-400">Umbral:</label>
              <input type="range" min={12} max={25} value={upperThreshold} onChange={(e)=>setUpperThreshold(Number(e.target.value))} />
              <div className="text-sm text-neutral-200">{upperThreshold}</div>
            </div>
            <button onClick={() => {
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
            }} className="ml-3 bg-[#26282D] px-3 py-1 rounded text-sm">Exportar CSV</button>
          </div>
        </div>

        <div style={{ height: 260 }} className="mb-6">
          <ResponsiveContainer>
            <LineChart data={seriesByDate} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="rm" stroke="#82ca9d" name="1RM Estimado" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="volume" stroke="#8884d8" name="Volumen" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ height: 220 }}>
          <h4 className="font-bold mb-2">Volumen semanal por grupo muscular</h4>
          <ResponsiveContainer>
            <BarChart data={weeklyVolumeByMuscle} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="muscle" />
              <Tooltip />
              <Bar dataKey="count">
                {weeklyVolumeByMuscle.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
                <LabelList dataKey="label" position="right" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 text-sm text-neutral-400">Rango óptimo: 10-{upperThreshold} series/semana. <span className="text-yellow-400">&lt;10</span> Bajo • <span className="text-green-400">10-{upperThreshold}</span> Óptimo • <span className="text-red-400">&gt;{upperThreshold}</span> Alto</div>
        </div>
      </div>
    </div>
  );
}
