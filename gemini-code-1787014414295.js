import React, { useState, useEffect, useCallback } from "react";
import { ChevronDown, Plus, Trash2, RotateCcw, Dumbbell, X, Check, Edit3, Settings, Calendar, History } from "lucide-react";

// Configuración visual por día
const PLATE = {
  lun: { hex: "#D7263D", label: "25", sub: "Empuje A" },
  mar: { hex: "#1E6FD9", label: "20", sub: "Tracción A" },
  mie: { hex: "#F2C230", label: "15", sub: "Pierna" },
  jue: { hex: "#2E9E5B", label: "10", sub: "Empuje B" },
  vie: { hex: "#C9CDD3", label: "5", sub: "Tracción B" },
};

// Rutina por defecto si el usuario no tiene ninguna guardada
const DEFAULT_ROUTINE = [
  {
    id: "lun",
    label: "Lunes",
    exercises: [
      { id: "lun-inclinado-mancuerna", name: "Press banco inclinado c/mancuerna", sets: 4, reps: "8-10", rir: "1-2", rest: "2-3 min" },
      { id: "lun-plano-mancuerna", name: "Press banco plano c/mancuerna", sets: 3, reps: "10-12", rir: "1-2", rest: "90-120s" },
      { id: "lun-lateral-mancuerna", name: "Elevación lateral c/mancuerna", sets: 3, reps: "12-15", rir: "1", rest: "60-90s" },
      { id: "lun-press-hombro", name: "Press de hombro c/mancuerna (sentado)", sets: 3, reps: "8-10", rir: "1-2", rest: "90-120s" },
      { id: "lun-ext-triceps-nuca", name: "Extensión tríceps tras nuca c/mancuerna", sets: 3, reps: "10-12", rir: "1", rest: "60-90s" },
      { id: "lun-ext-triceps-barra", name: "Extensión tríceps polea (barra)", sets: 2, reps: "12-15", rir: "0-1", rest: "60s" },
    ],
  },
  {
    id: "mar",
    label: "Martes",
    exercises: [
      { id: "mar-jalon-prono", name: "Jalón polea prono", sets: 4, reps: "8-10", rir: "1-2", rest: "2-3 min" },
      { id: "mar-remo-cerrado", name: "Remo sentado (agarre cerrado)", sets: 3, reps: "10-12", rir: "1-2", rest: "90-120s" },
      { id: "mar-jalon-v", name: "Jalón polea agarre V", sets: 3, reps: "10-12", rir: "1", rest: "90s" },
      { id: "mar-jalon-cara", name: "Jalón a la cara (soga)", sets: 3, reps: "15", rir: "1", rest: "60s" },
      { id: "mar-curl-scott", name: "Curl banco Scott (barra EZ)", sets: 3, reps: "10-12", rir: "1", rest: "60-90s" },
      { id: "mar-curl-martillo", name: "Curl martillo c/mancuerna", sets: 2, reps: "12-15", rir: "0-1", rest: "60s" },
    ],
  },
  {
    id: "mie",
    label: "Miércoles",
    exercises: [
      { id: "mie-prensa", name: "Prensa", sets: 3, reps: "10-12", rir: "1-2", rest: "2 min" },
      { id: "mie-curl-femoral", name: "Curl femoral", sets: 3, reps: "10-12", rir: "1", rest: "90s" },
      { id: "mie-ext-rodilla", name: "Extensión de rodilla", sets: 2, reps: "12-15", rir: "1", rest: "60-90s" },
      { id: "mie-pantorrilla", name: "Pantorrilla", sets: 2, reps: "15-20", rir: "1", rest: "60s" },
      { id: "mie-plancha", name: "Plancha / elevación de piernas", sets: 3, reps: "30-45s", rir: "—", rest: "45s" },
    ],
  },
  {
    id: "jue",
    label: "Jueves",
    exercises: [
      { id: "jue-declinado-mancuerna", name: "Press banco declinado c/mancuerna", sets: 4, reps: "8-10", rir: "1-2", rest: "2-3 min" },
      { id: "jue-inclinado-liviano", name: "Press banco inclinado (mayor rep)", sets: 3, reps: "12-15", rir: "1-2", rest: "90-120s" },
      { id: "jue-lateral-polea", name: "Elevación lateral (polea)", sets: 3, reps: "12-15", rir: "1", rest: "60-90s" },
      { id: "jue-press-militar-ez", name: "Press militar c/barra EZ", sets: 3, reps: "8-10", rir: "1-2", rest: "90-120s" },
      { id: "jue-ext-triceps-cuerda", name: "Extensión tríceps polea (cuerda)", sets: 3, reps: "12-15", rir: "1", rest: "60-90s" },
    ],
  },
  {
    id: "vie",
    label: "Viernes",
    exercises: [
      { id: "vie-remo-ancho", name: "Remo sentado agarre ancho", sets: 4, reps: "8-10", rir: "1-2", rest: "2-3 min" },
      { id: "vie-jalon-barra", name: "Jalón polea agarre barra", sets: 3, reps: "10-12", rir: "1-2", rest: "90-120s" },
      { id: "vie-jalon-v-rep", name: "Jalón polea agarre V (mayor rep)", sets: 3, reps: "12-15", rir: "1", rest: "90s" },
      { id: "vie-curl-polea-barra", name: "Curl polea con barra", sets: 3, reps: "10-12", rir: "1", rest: "60-90s" },
      { id: "vie-curl-inclinado", name: "Curl inclinado c/mancuerna", sets: 2, reps: "12-15", rir: "1", rest: "60-90s" },
    ],
  },
];

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const displayDate = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
};

const defaultDayId = () => {
  const map = { 1: "lun", 2: "mar", 3: "mie", 4: "jue", 5: "vie" };
  return map[new Date().getDay()] || "lun";
};

export default function RutinaTracker() {
  const [routine, setRoutine] = useState(DEFAULT_ROUTINE);
  const [selectedDay, setSelectedDay] = useState(defaultDayId());
  const [history, setHistory] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(null); // id del ejercicio
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Estado para editar o agregar ejercicio
  const [editingEx, setEditingEx] = useState(null); // null = creando, objeto = editando

  const [drafts, setDrafts] = useState({});
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  // Cargar Rutina de localStorage al iniciar
  useEffect(() => {
    try {
      const savedRoutine = localStorage.getItem("wlog_routine_structure");
      if (savedRoutine) {
        setRoutine(JSON.parse(savedRoutine));
      }
    } catch (e) {
      console.error("Error al cargar estructura", e);
    }
  }, []);

  // Guardar Rutina en localStorage al cambiar
  const saveRoutineStructure = (newRoutine) => {
    setRoutine(newRoutine);
    localStorage.setItem("wlog_routine_structure", JSON.stringify(newRoutine));
  };

  // Cargar Historiales de localStorage
  const loadExerciseHistory = useCallback((id) => {
    try {
      const res = localStorage.getItem(`wlog:${id}`);
      return res ? JSON.parse(res) : [];
    } catch {
      return [];
    }
  }, []);

  const day = routine.find((d) => d.id === selectedDay) || routine[0];
  const plate = PLATE[selectedDay] || PLATE["lun"];

  useEffect(() => {
    const newHistory = {};
    day.exercises.forEach((ex) => {
      newHistory[ex.id] = loadExerciseHistory(ex.id);
    });
    setHistory((prev) => ({ ...prev, ...newHistory }));
  }, [selectedDay, day, loadExerciseHistory]);

  const saveHistory = (exerciseId, newHistory) => {
    try {
      localStorage.setItem(`wlog:${exerciseId}`, JSON.stringify(newHistory));
      setHistory((prev) => ({ ...prev, [exerciseId]: newHistory }));
      setErrorMsg("");
    } catch {
      setErrorMsg("Error al guardar registro.");
    }
  };

  const getTodaySets = (exerciseId) => {
    const h = history[exerciseId] || [];
    const t = h.find((s) => s.date === todayISO());
    return t ? t.sets : [];
  };

  const getLastSession = (exerciseId) => {
    const h = history[exerciseId] || [];
    const past = h.filter((s) => s.date !== todayISO()).sort((a, b) => (a.date < b.date ? 1 : -1));
    return past[0];
  };

  const addSet = (exerciseId) => {
    const draft = drafts[exerciseId] || {};
    const weight = parseFloat(draft.weight);
    const reps = parseInt(draft.reps, 10);
    if (!weight || weight <= 0 || !reps || reps <= 0) {
      setErrorMsg("Ingresá un peso y repeticiones válidos.");
      return;
    }
    const h = history[exerciseId] || loadExerciseHistory(exerciseId);
    const today = todayISO();
    const rest = h.filter((s) => s.date !== today);
    const current = h.find((s) => s.date === today);
    const newSets = current ? [...current.sets, { weight, reps }] : [{ weight, reps }];
    const newHistory = [...rest, { date: today, sets: newSets }];
    saveHistory(exerciseId, newHistory);
    setDrafts((prev) => ({ ...prev, [exerciseId]: { weight: "", reps: String(reps) } }));
  };

  const removeLastSet = (exerciseId) => {
    const h = history[exerciseId] || [];
    const today = todayISO();
    const current = h.find((s) => s.date === today);
    if (!current || current.sets.length === 0) return;
    const newSets = current.sets.slice(0, -1);
    const rest = h.filter((s) => s.date !== today);
    const newHistory = newSets.length > 0 ? [...rest, { date: today, sets: newSets }] : rest;
    saveHistory(exerciseId, newHistory);
  };

  // --- MODIFICAR O AGREGAR EJERCICIOS ---
  const handleSaveExercise = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get("name");
    const sets = parseInt(formData.get("sets"), 10);
    const reps = formData.get("reps");
    const rir = formData.get("rir");
    const rest = formData.get("rest");

    if (!name) return;

    const newRoutine = routine.map((d) => {
      if (d.id !== selectedDay) return d;

      let updatedExercises = [...d.exercises];
      if (editingEx && editingEx.id) {
        // Modo Edición
        updatedExercises = updatedExercises.map((ex) =>
          ex.id === editingEx.id ? { ...ex, name, sets, reps, rir, rest } : ex
        );
      } else {
        // Modo Crear
        const newId = `${selectedDay}-${Date.now()}`;
        updatedExercises.push({ id: newId, name, sets, reps, rir, rest });
      }
      return { ...d, exercises: updatedExercises };
    });

    saveRoutineStructure(newRoutine);
    setEditingEx(null);
  };

  const handleDeleteExercise = (exId) => {
    const newRoutine = routine.map((d) => {
      if (d.id !== selectedDay) return d;
      return { ...d, exercises: d.exercises.filter((ex) => ex.id !== exId) };
    });
    saveRoutineStructure(newRoutine);
  };

  const doReset = () => {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("wlog:")) {
          localStorage.removeItem(key);
        }
      });
      setHistory({});
      setErrorMsg("");
    } catch {
      setErrorMsg("No se pudo borrar el historial.");
    } finally {
      setConfirmReset(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#111214] text-neutral-100 font-sans pb-16">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 border-b border-neutral-800 sticky top-0 bg-[#111214]/95 backdrop-blur z-10 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-neutral-500 text-[11px] uppercase tracking-[0.2em] font-semibold mb-1">
            <Dumbbell size={13} strokeWidth={2.5} />
            Rutina Personalizable
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight leading-none">
            {day.label}
            <span className="ml-2 text-base font-bold" style={{ color: plate.hex }}>
              {plate.sub}
            </span>
          </h1>
        </div>

        {/* Botón Administrar Rutina */}
        <button
          onClick={() => {
            setIsEditMode(!isEditMode);
            setEditingEx(null);
          }}
          className={`p-2.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all ${
            isEditMode
              ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
              : "bg-[#1B1D21] border-neutral-800 text-neutral-400 hover:text-white"
          }`}
        >
          <Settings size={16} />
          {isEditMode ? "Listo" : "Editar"}
        </button>
      </div>

      {/* Selector de Día */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
        {routine.map((d) => {
          const p = PLATE[d.id] || { hex: "#888", label: "P", sub: "" };
          const active = d.id === selectedDay;
          return (
            <button
              key={d.id}
              onClick={() => {
                setSelectedDay(d.id);
                setExpanded(null);
                setEditingEx(null);
              }}
              className="shrink-0 flex items-center gap-2 rounded-full pl-1.5 pr-3.5 py-1.5 border transition-colors"
              style={{
                borderColor: active ? p.hex : "#2a2c30",
                backgroundColor: active ? `${p.hex}1A` : "transparent",
              }}
            >
              <span
                className="flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black"
                style={{ backgroundColor: p.hex, color: p.hex === "#C9CDD3" || p.hex === "#F2C230" ? "#111214" : "#fff" }}
              >
                {p.label}
              </span>
              <span className={`text-xs font-bold uppercase tracking-wide ${active ? "text-neutral-100" : "text-neutral-500"}`}>
                {d.label.slice(0, 3)}
              </span>
            </button>
          );
        })}
      </div>

      {/* MODO EDICIÓN: Formulario Agregar/Editar Ejercicio */}
      {isEditMode && (
        <div className="mx-4 mb-4 p-4 rounded-2xl bg-[#1B1D21] border border-amber-500/40">
          <h3 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
            <Edit3 size={15} />
            {editingEx ? `Editando: ${editingEx.name}` : `Agregar nuevo ejercicio a ${day.label}`}
          </h3>
          <form onSubmit={handleSaveExercise} className="flex flex-col gap-3">
            <div>
              <label className="text-[10px] text-neutral-400 font-semibold uppercase">Nombre del Ejercicio</label>
              <input
                name="name"
                defaultValue={editingEx?.name || ""}
                required
                placeholder="Ej: Press Banca Plano"
                className="w-full bg-[#26282D] border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-neutral-400 font-semibold uppercase">Series</label>
                <input
                  name="sets"
                  type="number"
                  defaultValue={editingEx?.sets || 3}
                  required
                  className="w-full bg-[#26282D] border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 font-semibold uppercase">Reps Obj.</label>
                <input
                  name="reps"
                  defaultValue={editingEx?.reps || "10-12"}
                  required
                  className="w-full bg-[#26282D] border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-neutral-400 font-semibold uppercase">RIR</label>
                <input
                  name="rir"
                  defaultValue={editingEx?.rir || "1-2"}
                  className="w-full bg-[#26282D] border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 font-semibold uppercase">Descanso</label>
                <input
                  name="rest"
                  defaultValue={editingEx?.rest || "90s"}
                  className="w-full bg-[#26282D] border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                className="flex-1 bg-amber-500 text-black font-bold py-2 rounded-lg text-xs uppercase"
              >
                {editingEx ? "Guardar Cambios" : "Añadir Ejercicio"}
              </button>
              {editingEx && (
                <button
                  type="button"
                  onClick={() => setEditingEx(null)}
                  className="bg-neutral-800 text-neutral-300 font-bold px-3 py-2 rounded-lg text-xs"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Lista de Ejercicios */}
      <div className="px-4 flex flex-col gap-3 mt-2">
        {day.exercises.map((ex) => {
          const isOpen = expanded === ex.id;
          const todaySets = getTodaySets(ex.id);
          const last = getLastSession(ex.id);
          const draft = drafts[ex.id] || { weight: "", reps: "" };
          const doneCount = todaySets.length;
          const targetCount = ex.sets;

          return (
            <div
              key={ex.id}
              className="rounded-2xl bg-[#1B1D21] border border-neutral-800 overflow-hidden"
              style={{ borderLeftColor: plate.hex, borderLeftWidth: 3 }}
            >
              <div className="w-full flex items-center justify-between px-4 py-3.5">
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => setExpanded(isOpen ? null : ex.id)}
                >
                  <div className="font-bold text-[15px] leading-snug pr-2">{ex.name}</div>
                  <div className="text-neutral-500 text-xs mt-0.5 tabular-nums">
                    {ex.sets}×{ex.reps} · RIR {ex.rir} · descanso {ex.rest}
                  </div>
                  <div className="text-xs mt-1 tabular-nums flex items-center gap-1" style={{ color: plate.hex }}>
                    {last
                      ? `Última vez (${displayDate(last.date)}): ${last.sets.map((s) => `${s.weight}kg×${s.reps}`).join(", ")}`
                      : "Sin registros previos"}
                  </div>
                </div>

                {/* Acciones en el lateral del Card */}
                <div className="flex items-center gap-2 shrink-0">
                  {isEditMode ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingEx(ex)}
                        className="p-2 text-amber-400 bg-amber-500/10 rounded-lg"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteExercise(ex.id)}
                        className="p-2 text-red-400 bg-red-500/10 rounded-lg"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Botón Ver Historial Completo */}
                      <button
                        onClick={() => setShowHistoryModal(ex.id)}
                        className="p-2 text-neutral-400 hover:text-white bg-[#26282D] rounded-lg"
                        title="Ver Historial Completo"
                      >
                        <History size={16} />
                      </button>

                      <span
                        className="text-[11px] font-bold rounded-full px-2 py-1 tabular-nums cursor-pointer"
                        onClick={() => setExpanded(isOpen ? null : ex.id)}
                        style={{
                          backgroundColor: doneCount >= targetCount ? "#2E9E5B33" : "#2a2c30",
                          color: doneCount >= targetCount ? "#59D98A" : "#9a9ca1",
                        }}
                      >
                        {doneCount}/{targetCount}
                      </span>
                      <ChevronDown
                        size={18}
                        onClick={() => setExpanded(isOpen ? null : ex.id)}
                        className={`text-neutral-500 cursor-pointer transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Panel Desplegable para Agregar Series del Día */}
              {isOpen && !isEditMode && (
                <div className="px-4 pb-4 border-t border-neutral-800 pt-3">
                  {todaySets.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {todaySets.map((s, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 bg-[#26282D] rounded-lg px-2.5 py-1.5 text-xs font-semibold tabular-nums"
                        >
                          <Check size={12} style={{ color: plate.hex }} />
                          serie {i + 1}: {s.weight}kg × {s.reps}
                        </div>
                      ))}
                      <button
                        onClick={() => removeLastSet(ex.id)}
                        className="flex items-center gap-1 text-xs text-neutral-500 hover:text-red-400 px-2 py-1.5"
                      >
                        <Trash2 size={12} /> última
                      </button>
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] uppercase tracking-wide text-neutral-500 font-semibold">Kg</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={draft.weight}
                        onChange={(e) => setDrafts((p) => ({ ...p, [ex.id]: { ...draft, weight: e.target.value } }))}
                        placeholder="0"
                        className="w-full mt-1 bg-[#26282D] border border-neutral-700 rounded-lg px-3 py-2.5 text-lg font-bold tabular-nums outline-none focus:border-neutral-400"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] uppercase tracking-wide text-neutral-500 font-semibold">Reps</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={draft.reps}
                        onChange={(e) => setDrafts((p) => ({ ...p, [ex.id]: { ...draft, reps: e.target.value } }))}
                        placeholder="0"
                        className="w-full mt-1 bg-[#26282D] border border-neutral-700 rounded-lg px-3 py-2.5 text-lg font-bold tabular-nums outline-none focus:border-neutral-400"
                      />
                    </div>
                    <button
                      onClick={() => addSet(ex.id)}
                      className="shrink-0 flex items-center justify-center rounded-lg px-4 py-2.5 font-bold text-sm"
                      style={{ backgroundColor: plate.hex, color: plate.hex === "#C9CDD3" || plate.hex === "#F2C230" ? "#111214" : "#fff" }}
                    >
                      <Plus size={18} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL HISTORIAL COMPLETO DE UN EJERCICIO */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1B1D21] border border-neutral-800 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
            <div className="px-4 py-3.5 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-neutral-100">
                  {routine.flatMap((d) => d.exercises).find((e) => e.id === showHistoryModal)?.name}
                </h3>
                <p className="text-xs text-neutral-500">Historial de entrenamientos pasados</p>
              </div>
              <button
                onClick={() => setShowHistoryModal(null)}
                className="p-1.5 text-neutral-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex flex-col gap-3">
              {(history[showHistoryModal] || []).length === 0 ? (
                <div className="text-center py-6 text-neutral-500 text-xs">
                  Aún no tenés registros guardados para este ejercicio.
                </div>
              ) : (
                [...(history[showHistoryModal] || [])]
                  .sort((a, b) => (a.date < b.date ? 1 : -1))
                  .map((session, idx) => (
                    <div key={idx} className="bg-[#26282D] rounded-xl p-3 border border-neutral-800">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-2">
                        <Calendar size={13} />
                        {displayDate(session.date)}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {session.sets.map((s, sIdx) => (
                          <div
                            key={sIdx}
                            className="bg-[#1B1D21] border border-neutral-700/50 rounded-lg px-2.5 py-1 text-xs text-neutral-300 font-mono"
                          >
                            S{sIdx + 1}: <strong className="text-white">{s.weight}kg</strong> × {s.reps}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mx-4 mt-4 text-xs bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-3 py-2">
          {errorMsg}
        </div>
      )}

      {/* Reset Historial */}
      <div className="px-4 mt-8">
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            className="w-full flex items-center justify-center gap-2 text-xs text-neutral-600 py-3 hover:text-red-400 transition-colors"
          >
            <RotateCcw size={12} /> Borrar todo mi historial de marcas
          </button>
        ) : (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 flex flex-col gap-2">
            <p className="text-xs text-neutral-300">
              Esto borra todos los registros guardados de marcas pasadas. La estructura de ejercicios se conservará.
            </p>
            <div className="flex gap-2">
              <button
                onClick={doReset}
                className="flex-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-lg py-2"
              >
                Sí, borrar marcas
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 bg-neutral-800 text-neutral-300 text-xs font-bold rounded-lg py-2 flex items-center justify-center gap-1"
              >
                <X size={12} /> Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}