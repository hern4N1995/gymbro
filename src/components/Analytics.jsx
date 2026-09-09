import React, { useEffect, useMemo, useState, useRef } from "react";
import { X } from "lucide-react";
import supabase from "../../supabaseClient";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { estimate1RM, volumeSeries } from "../utils/fitnessHelpers";
import EXERCISE_MUSCLE_MAP from "../config/muscleMapping";
import { PrimaryButton, SecondaryButton } from "./Button";
import useClickOutside from "../hooks/useClickOutside";

export default function Analytics({ user, onClose, isVisible = true }) {
  const D = 300;
  const easing = 'cubic-bezier(0.34,1.56,0.64,1)';
  const [hist, setHist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exerciseList, setExerciseList] = useState([]); // { id, name, muscle_group }
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedRange, setSelectedRange] = useState('4w');
  const [upperThreshold, setUpperThreshold] = useState(20);

  // analytics uses exact exercise_id matching to avoid merging similar names

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
        // include `exercise_id` (slug/text) so we can match against historial.exercise_id
        const { data: r, error: rErr } = await supabase.from('rutinas_usuario').select('id,exercise_id,name,muscle_group').eq('user_id', user.id);
        if (rErr) throw rErr;
        const slugify = (s) => s ? String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^[-]+|[-]+$/g,'') : '';
        const uniqueByName = new Map();
        (r || []).forEach((x) => {
          const key = String(x.name || '').trim().toLowerCase();
          if (!key) return;
          if (!uniqueByName.has(key)) {
            // use the stored `exercise_id` (text slug) as the id so it matches historial.exercise_id
            uniqueByName.set(key, { id: x.exercise_id || x.id, name: x.name, muscle_group: x.muscle_group, slug: slugify(x.name) });
          }
        });
        const map = Array.from(uniqueByName.values());
        setExerciseList(map);
        if (map.length && !selectedExercise) {
          // pick an exercise that already has historial rows if possible (exact exercise_id match)
          const pick = map.find(entry => (h || []).some(hr => String(hr.exercise_id) === String(entry.id)));
          setSelectedExercise((pick && pick.id) || map[0].id);
        }
      } catch (e) {
        console.error('Error cargando analíticas', e);
        alert('Error cargando analíticas: ' + (e.message || e));
      } finally {
        setLoading(false);
      }
    };
    if (user) load();
  }, [user, selectedRange]);

  

  const selectedExerciseHist = useMemo(() => {
    if (!selectedExercise) return [];
    const selEntry = exerciseList.find(e => String(e.id) === String(selectedExercise) || String(e.slug) === String(selectedExercise) || String(e.name).toLowerCase() === String(selectedExercise).toLowerCase());
    if (!selEntry) return [];
    return hist.filter(h => String(h.exercise_id) === String(selEntry.id));
  }, [hist, selectedExercise, exerciseList]);

  const seriesByDate = useMemo(() => {
    if (!selectedExercise) return [];
    // find selected entry metadata
    const selEntry = exerciseList.find(e => String(e.id) === String(selectedExercise) || String(e.slug) === String(selectedExercise) || String(e.name).toLowerCase() === String(selectedExercise).toLowerCase());
    if (!selEntry) return [];
    const byDate = {};
    selectedExerciseHist.forEach((r) => {
      const d = r.date;
      if (!byDate[d]) byDate[d] = { date: d, volumes: 0, rms: [] };
      const vol = volumeSeries(r);
      byDate[d].volumes += vol;
      const rm = estimate1RM({ weight: r.weight, reps: r.reps, rir: r.rir });
      if (rm) byDate[d].rms.push(rm);
    });
    const arr = Object.values(byDate).sort((a,b)=>a.date<b.date?-1:1).map(d=>({ date: d.date, volume: d.volumes, rm: d.rms.length?Math.max(...d.rms):null }));
    console.log('[Analytics seriesByDate]', JSON.parse(JSON.stringify(arr)));
    return arr;
  }, [selectedExerciseHist, selectedExercise, exerciseList]);

  const weeklyVolumeByMuscle = useMemo(() => {
    // last 7 days (count series per muscle)
    const now = new Date();
    const sevenAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    const perMuscle = {};
    hist.forEach(r => {
      const d = new Date(r.date + 'T00:00:00');
      if (d < sevenAgo) return;
      const rid = String(r.exercise_id || '');
      const ex = exerciseList.find(x => String(rid) === String(x.id));
      const muscle = ex?.muscle_group || EXERCISE_MUSCLE_MAP[rid] || 'Otros';
      perMuscle[muscle] = (perMuscle[muscle] || 0) + 1;
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
    const { x, y, width, height, payload, value } = props;
    const rawCount = payload?.count ?? payload?.value ?? value ?? payload?.payload?.count ?? payload?.payload?.value ?? 0;
    const count = Number.isFinite(Number(rawCount)) ? Number(rawCount) : 0;
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

  const volumeMax = useMemo(() => {
    if (!seriesByDate.length) return 100;
    const maxValue = Math.max(...seriesByDate.map((point) => Number(point.volume || 0)));
    return Math.max(100, Math.ceil(maxValue * 1.2));
  }, [seriesByDate]);

  const rmMax = useMemo(() => {
    if (!seriesByDate.length) return 50;
    const maxValue = Math.max(...seriesByDate.map((point) => Number(point.rm || 0)));
    return Math.max(50, Math.ceil(maxValue * 1.2));
  }, [seriesByDate]);

  const muscleGroupOrder = ['Pecho','Espalda','Hombro','Bíceps','Tríceps','Pierna','Otros'];
  const muscleGroupColors = {
    Pecho: '#F59E0B',
    Espalda: '#60A5FA',
    Hombro: '#A78BFA',
    Bíceps: '#34D399',
    Tríceps: '#FB7185',
    Pierna: '#F97316',
    Otros: '#94A3B8'
  };
  const exerciseSearchRef = useRef(null);
  const [exerciseSearchOpen, setExerciseSearchOpen] = useState(false);
  const [exerciseSelectionTouched, setExerciseSelectionTouched] = useState(false);

  const selectedExerciseMeta = useMemo(() => {
    if (!selectedExercise) return null;
    return exerciseList.find(ex => String(ex.id) === String(selectedExercise)) || null;
  }, [selectedExercise, exerciseList]);

  const filteredExerciseGroups = useMemo(() => {
    const term = search.trim().toLowerCase();

    return muscleGroupOrder
      .map((group) => {
        const items = exerciseList.filter((ex) => {
          const matchesGroup = (ex.muscle_group || 'Otros') === group;
          if (!matchesGroup) return false;
          if (!term) return true;

          const name = String(ex.name || '').toLowerCase();
          const tokens = name.split(/\s+/).filter(Boolean);

          return (
            name.startsWith(term) ||
            tokens.some((token) => token.startsWith(term) || token.includes(term))
          );
        });
        return { group, items };
      })
      .filter(({ items }) => items.length > 0);
  }, [exerciseList, muscleGroupOrder, search]);

  const handleSelectExercise = (exercise) => {
    if (!exercise) return;
    setSelectedExercise(exercise.id);
    setSearch(exercise.name);
    setExerciseSelectionTouched(true);
    setExerciseSearchOpen(false);
  };

  const handleClearExerciseSearch = () => {
    setSelectedExercise(null);
    setSearch('');
    setExerciseSelectionTouched(false);
    setExerciseSearchOpen(true);
    window.setTimeout(() => {
      const input = exerciseSearchRef.current?.querySelector('input');
      if (input) input.focus();
    }, 0);
  };

  const containerRef = useRef(null);
  const showDebugAnalytics = user?.id === '25bf8d62-56b7-4e21-9822-91373cf58f3f';

  const renderChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div
        style={{
          backgroundColor: '#0F1112',
          border: '1px solid #2A2D31',
          borderRadius: 10,
          color: '#E5E7EB',
          boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
          padding: '10px 12px',
          minWidth: 150,
        }}
      >
        <div style={{ color: '#F3F4F6', fontWeight: 700, marginBottom: 6 }}>Fecha: {label}</div>
        {payload.map((entry, index) => {
          const isVolume = entry.dataKey === 'volume';
          const name = isVolume ? 'Volumen' : 'RM estimado';
          const color = isVolume ? '#8B5CF6' : '#34D399';
          const value = Number(entry.value);
          const display = Number.isFinite(value) ? Number(value).toFixed(1) : (entry.value ?? '—');

          return (
            <div key={`${name}-${index}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, color, fontSize: 12, fontWeight: 600 }}>
              <span>{name}</span>
              <span style={{ color: '#E5E7EB' }}>{display}</span>
            </div>
          );
        })}
      </div>
    );
  };

  useClickOutside(containerRef, onClose, true);
  useClickOutside(exerciseSearchRef, () => setExerciseSearchOpen(false), true);

  return (
    <div className="fixed inset-0 z-50 p-0 sm:p-4 flex items-start sm:items-center justify-center" style={{ pointerEvents: isVisible ? 'auto' : 'none' }}>
      <div className="fixed inset-0 bg-black/60" style={{ transition: `opacity ${D}ms ${easing}`, opacity: isVisible ? 1 : 0 }} />
      <div ref={containerRef} className="relative bg-[#111214] border border-neutral-800 rounded-none sm:rounded-2xl w-full h-full sm:h-auto sm:max-w-4xl overflow-auto p-4" style={{ transform: isVisible ? 'translateX(0)' : 'translateX(100%)', transition: `transform ${D}ms ${easing}, opacity ${D}ms ${easing}`, opacity: isVisible ? 1 : 0 }}>
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
        {showDebugAnalytics && (
          <div className="mt-4 p-3 bg-[#080909] border border-neutral-800 rounded-md text-sm text-neutral-300">
            <details>
              <summary className="cursor-pointer font-medium">Debug Analytics (mostrar)</summary>
              <div className="mt-2">
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 320, overflow: 'auto' }}>
{JSON.stringify({
  userId: user?.id,
  selectedRange,
  selectedExercise,
  selectedExerciseHistCount: selectedExerciseHist.length,
  selectedExerciseHistRows: selectedExerciseHist.map((row) => ({ ...row })),
  selectedExerciseChartPointsCount: seriesByDate.length,
  selectedExerciseChartPoints: seriesByDate.map((point) => ({ ...point })),
  exerciseListSample: (exerciseList||[]).slice(0,8).map(e=>({ id: e.id, name: e.name, slug: e.slug })),
  exerciseListLength: exerciseList.length,
  histLength: hist.length,
  histSample: (hist||[]).slice(0,8).map(h=>({ exercise_id: h.exercise_id, exercise_name: h.exercise_name, date: h.date }))
}, null, 2)}
                </pre>
              </div>
            </details>
          </div>
        )}

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
            <div className="flex-1 relative" ref={exerciseSearchRef}>
              <input
                value={search}
                onFocus={() => setExerciseSearchOpen(true)}
                onClick={() => setExerciseSearchOpen(true)}
                onBlur={() => {
                  window.setTimeout(() => setExerciseSearchOpen(false), 120);
                }}
                onChange={(e) => {
                  const next = e.target.value;
                  setSearch(next);
                  setExerciseSearchOpen(true);
                }}
                placeholder="Buscar ejercicio"
                className="w-full bg-[#0B0C0D] p-2 pr-9 rounded-xl border border-neutral-600 text-neutral-100 placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none shadow-sm"
              />

              {(search.trim().length > 0 || exerciseSelectionTouched) && (
                <button
                  type="button"
                  aria-label="Borrar búsqueda"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleClearExerciseSearch();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-medium text-neutral-400 underline decoration-neutral-500 underline-offset-2 transition hover:text-neutral-200"
                >
                  Borrar
                </button>
              )}

              {exerciseSearchOpen && (
                <div
                  className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-[320px] overflow-y-auto overflow-x-hidden rounded-2xl border border-neutral-700 bg-[#1B1D21] shadow-2xl shadow-black/40"
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  {filteredExerciseGroups.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-neutral-400">No se encontraron ejercicios</div>
                  ) : (
                    filteredExerciseGroups.map(({ group, items }) => (
                      <div key={group} className="border-b border-neutral-800 last:border-b-0">
                        <div className="flex items-center gap-2 bg-[#15181A] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: muscleGroupColors[group] || '#94A3B8' }}
                          />
                          {group}
                        </div>
                        <div className="py-1">
                          {items.map((exercise) => (
                            <button
                              key={exercise.id}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectExercise(exercise);
                              }}
                              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-neutral-200 transition hover:bg-[#262A2D] focus:bg-[#262A2D] focus:outline-none"
                            >
                              <span className="truncate">{exercise.name}</span>
                              <span className="text-[10px] text-neutral-500">{exercise.muscle_group || 'Otros'}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
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
                    const ex = exerciseList.find(x => String(r.exercise_id) === String(x.id));
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
            <h4 className="font-bold mb-2">Progreso del ejercicio</h4>
            {seriesByDate.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-neutral-500">Todavía no registraste series de este ejercicio — volvé después de tu próximo entrenamiento para ver tu progreso acá.</div>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap items-center gap-4 text-[11px] text-neutral-300">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#8B5CF6' }} />
                    <span>Volumen</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#34D399' }} />
                    <span>RM estimado (1RM)</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={seriesByDate} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2D31" />
                    <XAxis dataKey="date" tick={{ fill: '#D1D5DB', fontSize: 11 }} axisLine={{ stroke: '#374151' }} tickLine={{ stroke: '#374151' }} />
                    <YAxis
                      yAxisId="left"
                      orientation="left"
                      domain={[0, (dataMax) => Math.max(100, Math.ceil(dataMax * 1.2))]}
                      tick={{ fill: '#D1D5DB', fontSize: 11 }}
                      axisLine={{ stroke: '#374151' }}
                      tickLine={{ stroke: '#374151' }}
                      label={{ value: 'Volumen', angle: -90, position: 'insideLeft', fill: '#D1D5DB', fontSize: 11 }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, (dataMax) => Math.max(150, Math.ceil(dataMax * 1.2))]}
                      tick={{ fill: '#D1D5DB', fontSize: 11 }}
                      axisLine={{ stroke: '#374151' }}
                      tickLine={{ stroke: '#374151' }}
                      label={{ value: 'RM estimado', angle: 90, position: 'insideRight', fill: '#D1D5DB', fontSize: 11 }}
                    />
                    <Tooltip
                      content={renderChartTooltip}
                      cursor={{ stroke: '#374151', strokeDasharray: '4 4' }}
                    />
                    <Line yAxisId="right" type="monotone" dataKey="rm" stroke="#34D399" strokeWidth={2.5} name="RM estimado (1RM)" dot={{ r: 4, fill: '#34D399', stroke: '#0F1112', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    <Line yAxisId="left" type="monotone" dataKey="volume" stroke="#8B5CF6" strokeWidth={2.5} name="Volumen" dot={{ r: 4, fill: '#8B5CF6', stroke: '#0F1112', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </>
            )}
          </div>

          <div className="card p-3" style={{ minHeight: 220 }}>
            <h4 className="font-bold mb-2">Volumen semanal por grupo muscular</h4>
            {weeklyVolumeByMuscle.length === 0 ? (
              <div className="text-sm text-neutral-500">No hay datos disponibles.</div>
            ) : (
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={weeklyVolumeByMuscle} layout="vertical" margin={{ top: 5, right: 12, left: 6, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2D31" />
                  <XAxis
                    type="number"
                    domain={[0, weeklyMax]}
                    ticks={xTicks}
                    tick={{ fill: '#D1D5DB', fontSize: 11 }}
                    axisLine={{ stroke: '#374151' }}
                    tickLine={{ stroke: '#374151' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="muscle"
                    width={54}
                    interval={0}
                    tick={{ fill: '#E5E7EB', fontSize: 11 }}
                    tickMargin={6}
                    axisLine={{ stroke: '#374151' }}
                    tickLine={{ stroke: '#374151' }}
                  />
                  <Tooltip
                    formatter={(value) => [`${value} series`, 'Cantidad']}
                    labelFormatter={(label) => `Grupo: ${label}`}
                    contentStyle={{
                      backgroundColor: '#0F1112',
                      border: '1px solid #2A2D31',
                      borderRadius: 10,
                      color: '#E5E7EB',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
                      padding: '10px 12px'
                    }}
                    labelStyle={{ color: '#F3F4F6', fontWeight: 700 }}
                    itemStyle={{ color: '#E5E7EB' }}
                    cursor={{ fill: 'rgba(148, 163, 184, 0.06)' }}
                  />
                  <Bar dataKey="count" label={renderBarLabel} radius={[0, 6, 6, 0]}>
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
