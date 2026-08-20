import React, { useState, useEffect, useCallback } from "react";
import { ChevronDown, Plus, Trash2, RotateCcw, Dumbbell, X, Check, Edit3, Settings, Calendar, History } from "lucide-react";
import supabase from "./supabaseClient";
import RestTimer from "./src/components/RestTimer";
import ProfileModal from "./src/components/ProfileModal";
import Analytics from "./src/components/Analytics";
import { restDefaultByExercise, estimate1RM, volumeSeries } from "./src/utils/fitnessHelpers";
import EXERCISE_MUSCLE_MAP from "./src/config/muscleMapping";

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

const uniqueById = (arr) => {
  const seen = new Set();
  const out = [];
  (arr || []).forEach((it) => {
    const key = it.id || (it.exercise_id ?? null) || JSON.stringify(it);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(it);
    }
  });
  return out;
};

export default function RutinaTracker() {
  const [routine, setRoutine] = useState(DEFAULT_ROUTINE);
  const [selectedDay, setSelectedDay] = useState(defaultDayId());
  const [history, setHistory] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingEx, setEditingEx] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [session, setSession] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [showTimer, setShowTimer] = useState(false);
  const [loadingRoutine, setLoadingRoutine] = useState(false);
  const wakeLockRef = React.useRef(null);

  // Wake Lock: request while rest timer visible
  useEffect(() => {
    let visibilityHandler = null;
    const requestLock = async () => {
      try {
        if ('wakeLock' in navigator && showTimer) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          visibilityHandler = async () => {
            if (document.visibilityState === 'visible' && !wakeLockRef.current) {
              try {
                wakeLockRef.current = await navigator.wakeLock.request('screen');
              } catch {}
            }
          };
          document.addEventListener('visibilitychange', visibilityHandler);
        }
      } catch (e) {
        console.warn('WakeLock not available', e);
      }
    };

    const releaseLock = async () => {
      try {
        if (wakeLockRef.current && wakeLockRef.current.release) {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
        }
      } catch (e) {}
      if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
    };

    if (showTimer) requestLock();
    else releaseLock();

    return () => {
      releaseLock();
    };
  }, [showTimer]);

  // Auto-clear error toasts
  useEffect(() => {
    if (!errorMsg) return;
    const id = setTimeout(() => setErrorMsg(''), 4000);
    return () => clearTimeout(id);
  }, [errorMsg]);
  const [showProfile, setShowProfile] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [performanceAlert, setPerformanceAlert] = useState(null);

  // Auth listener: mantiene `session` actualizado
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data?.session ?? null);
      } catch (e) {
        console.error("Error getting session", e);
      }
    };
    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => {
      mounted = false;
      try {
        listener?.subscription?.unsubscribe?.();
      } catch {}
    };
  }, []);

  // Cargar estructura: si hay sesión, cargar desde Supabase; si no, desde localStorage
  useEffect(() => {
    const loadFromLocal = () => {
      try {
        const savedRoutine = localStorage.getItem("wlog_routine_structure");
        if (savedRoutine) {
          setRoutine(JSON.parse(savedRoutine));
        }
      } catch (e) {
        console.error("Error al cargar estructura local", e);
      }
    };

    const loadFromSupabase = async (userId) => {
      setLoadingRoutine(true);
      try {
        const { data, error } = await supabase.from("rutinas_usuario").select("*").eq("user_id", userId);
        if (error) throw error;
        if (!data || data.length === 0) {
          // Sembrar rutina por defecto en la tabla para este usuario
          const toInsert = DEFAULT_ROUTINE.flatMap((d) =>
            d.exercises.map((ex) => ({ user_id: userId, day_id: d.id, exercise_id: ex.id, exercise_name: ex.name, name: ex.name, sets: ex.sets, reps: ex.reps, rir: ex.rir, rest: ex.rest, muscle_group: EXERCISE_MUSCLE_MAP[ex.id] || 'Otros' }))
          );
          const { data: inserted, error: insErr } = await supabase.from("rutinas_usuario").insert(toInsert).select();
          if (insErr) throw insErr;
          // Normalize inserted rows so UI uses exercise_id as `id` when present
          const normalizedInserted = uniqueById((inserted || []).map(r => ({ ...r, id: r.exercise_id || r.id })));
          // Agrupar por día
          const grouped = DEFAULT_ROUTINE.map((d) => ({ ...d, exercises: uniqueById(normalizedInserted.filter((r) => r.day_id === d.id)) }));
          setRoutine(grouped);
          return;
        }
        // Normalize fetched rows so UI uses exercise_id as `id` when present
        const normalized = uniqueById((data || []).map(r => ({ ...r, id: r.exercise_id || r.id })));
        // Agrupar filas por day_id en la estructura esperada
        const grouped = DEFAULT_ROUTINE.map((d) => ({ ...d, exercises: uniqueById(normalized.filter((r) => r.day_id === d.id)) }));
        setRoutine(grouped);
      } catch (e) {
        console.error("Error cargando rutina desde Supabase", e);
        setErrorMsg('Error cargando rutina: ' + (e.message || e));
        loadFromLocal();
      }
      finally {
        setLoadingRoutine(false);
      }
    };

    if (session && session.user) {
      loadFromSupabase(session.user.id);
    } else {
      loadFromLocal();
    }
  }, [session]);

  const saveRoutineStructure = async (newRoutine) => {
    setRoutine(newRoutine);
    // Cuando hay sesión, persistir cambios en Supabase (se realiza por operación puntual en add/edit/delete). Mantener también copia local por compatibilidad.
    try {
      localStorage.setItem("wlog_routine_structure", JSON.stringify(newRoutine));
    } catch {}
  };

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

  // Al abrir un ejercicio (expanded), comprobar últimos 2 registros para detectar descenso
  useEffect(() => {
    const check = async () => {
      if (!expanded) return setPerformanceAlert(null);
      try {
        if (session && session.user) {
          const { data } = await supabase.from('historial').select('*').eq('user_id', session.user.id).eq('exercise_id', expanded).order('date', { ascending: false }).limit(3);
          if (data && data.length >= 2) {
            const last = data[0];
            const prev = data[1];
            if ((last.weight * last.reps) < (prev.weight * prev.reps)) {
              setPerformanceAlert('⚠️ Rendimiento en descenso las últimas 2 sesiones. Revisa tu descanso (sueño), tu ingesta de calorías/proteínas o si estás comiendo por debajo de tu metabolismo basal (BMR).');
              return;
            }
          }
          // Prefill drafts with latest registro
          const { data: lastRecArr } = await supabase.from('historial').select('*').eq('user_id', session.user.id).eq('exercise_id', expanded).order('date', { ascending: false }).limit(1);
          const lastRec = (lastRecArr && lastRecArr[0]) || null;
          if (lastRec) {
            setDrafts((prev) => ({ ...prev, [expanded]: { weight: String(lastRec.weight || ''), reps: String(lastRec.reps || ''), rir: lastRec.rir || '', notes: lastRec.notes || '' } }));
          }
        } else {
          const h = history[expanded] || [];
          if (h.length >= 2) {
            const sorted = [...h].sort((a,b)=>a.date<b.date?1:-1);
            const last = sorted[0];
            const prev = sorted[1];
            const lastVol = (last.sets || []).reduce((s,si)=>s + ((si.weight||0)*(si.reps||0)),0);
            const prevVol = (prev.sets || []).reduce((s,si)=>s + ((si.weight||0)*(si.reps||0)),0);
            if (lastVol < prevVol) {
              setPerformanceAlert('⚠️ Rendimiento en descenso las últimas 2 sesiones. Revisa tu descanso (sueño), tu ingesta de calorías/proteínas o si estás comiendo por debajo de tu metabolismo basal (BMR).');
              return;
            }
          }
          // Prefill drafts from local history
          if (h.length > 0) {
            const sorted = [...h].sort((a,b)=>a.date<b.date?1:-1);
            const last = sorted[0];
            if (last && last.sets && last.sets.length) {
              const s = last.sets[last.sets.length - 1];
              setDrafts((prev) => ({ ...prev, [expanded]: { weight: String(s.weight || ''), reps: String(s.reps || ''), rir: '', notes: '' } }));
            }
          }
        }
      } catch (e) {
        console.error('Error comprobando rendimiento', e);
      }
      setPerformanceAlert(null);
    };
    check();
  }, [expanded, session, history]);

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
    const rir = draft.rir;
    const notes = draft.notes;
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
    setDrafts((prev) => ({ ...prev, [exerciseId]: { weight: "", reps: String(reps), rir: "", notes: "" } }));

    // Persistir serie en Supabase `historial`
    (async () => {
      try {
        const exObj = routine.flatMap((d) => d.exercises).find((e) => e.id === exerciseId);
        const restSec = restDefaultByExercise(exObj?.name || "");
        setTimerSeconds(restSec);
        setShowTimer(true);

        if (session && session.user) {
          await supabase.from('historial').insert({ user_id: session.user.id, exercise_id: exerciseId, date: today, weight, reps, rir: rir || null, notes: notes || null });
        }
      } catch (err) {
        console.error('Error guardando historial en Supabase', err);
      }
    })();
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

  const handleSaveExercise = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get("name");
    const sets = parseInt(formData.get("sets"), 10);
    const reps = formData.get("reps");
    const rir = formData.get("rir");
    const rest = formData.get("rest");
    const formMuscle = formData.get("muscle_group") || EXERCISE_MUSCLE_MAP[editingEx?.id] || 'Otros';

    if (!name) return;

    if (session && session.user) {
      try {
        if (editingEx && editingEx.id) {
          // Actualizar ejercicio en Supabase
          const { data: updated, error: updErr } = await supabase
            .from("rutinas_usuario")
            .update({ name, sets, reps, rir, rest, day_id: selectedDay, muscle_group: formMuscle })
            .eq("id", editingEx.id)
            .select()
            .single();
          if (updErr) throw updErr;
        } else {
          // Insertar nuevo ejercicio en Supabase
          const { data: inserted, error: insErr } = await supabase
            .from("rutinas_usuario")
            .insert({ user_id: session.user.id, day_id: selectedDay, name, sets, reps, rir, rest, muscle_group: formMuscle })
            .select()
            .single();
          if (insErr) throw insErr;
        }

        // Refrescar toda la rutina desde Supabase para mantener consistencia
        const { data, error } = await supabase.from("rutinas_usuario").select("*").eq("user_id", session.user.id);
        if (error) throw error;
        const grouped = DEFAULT_ROUTINE.map((d) => ({ ...d, exercises: data.filter((r) => r.day_id === d.id) }));
        setRoutine(grouped);
      } catch (err) {
        console.error("Error guardando ejercicio en Supabase", err);
        setErrorMsg("No se pudo guardar el ejercicio en la nube.");
      } finally {
        setEditingEx(null);
      }
    } else {
      // Fallback local
      const newRoutine = routine.map((d) => {
        if (d.id !== selectedDay) return d;

        let updatedExercises = [...d.exercises];
        if (editingEx && editingEx.id) {
          updatedExercises = updatedExercises.map((ex) =>
            ex.id === editingEx.id ? { ...ex, name, sets, reps, rir, rest, muscle_group: formMuscle } : ex
          );
        } else {
          const newId = `${selectedDay}-${Date.now()}`;
          updatedExercises.push({ id: newId, name, sets, reps, rir, rest, muscle_group: formMuscle });
        }
        return { ...d, exercises: updatedExercises };
      });

      saveRoutineStructure(newRoutine);
      setEditingEx(null);
    }
  };

  const handleDeleteExercise = async (exId) => {
    const ok = window.confirm("¿Querés eliminar este ejercicio?");
    if (!ok) return;

    if (session && session.user) {
      try {
        const { error } = await supabase.from("rutinas_usuario").delete().eq("id", exId);
        if (error) throw error;
        // Refrescar desde Supabase
        const { data } = await supabase.from("rutinas_usuario").select("*").eq("user_id", session.user.id);
        const grouped = DEFAULT_ROUTINE.map((d) => ({ ...d, exercises: data.filter((r) => r.day_id === d.id) }));
        setRoutine(grouped);
      } catch (err) {
        console.error("Error borrando ejercicio en Supabase", err);
        setErrorMsg("No se pudo eliminar el ejercicio en la nube.");
      }
    } else {
      const newRoutine = routine.map((d) => {
        if (d.id !== selectedDay) return d;
        return { ...d, exercises: d.exercises.filter((ex) => ex.id !== exId) };
      });
      saveRoutineStructure(newRoutine);
    }
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

  // --- Autenticación (login / registro) ---
  const handleSignIn = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const email = fd.get("email");
    const password = fd.get("password");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setErrorMsg("");
    } catch (err) {
      setErrorMsg(err.message || "No se pudo iniciar sesión");
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    // support being called from a button click (e.target may be the button)
    const formEl = (e.target && e.target.form) ? e.target.form : e.target;
    const fd = new FormData(formEl);
    const email = fd.get("email");
    const password = fd.get("password");
    // basic client-side validation
    if (!email || !password) {
      setErrorMsg('Completa email y contraseña.');
      return;
    }
    if (String(password).length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    try {
      const res = await supabase.auth.signUp({ email, password });
      console.log('supabase.signUp response', res);
      if (res.error) {
        setErrorMsg(res.error.message || 'Error al registrarse');
        return;
      }
      setErrorMsg("Revisa tu correo para confirmar la cuenta (si aplica).");
    } catch (err) {
      setErrorMsg(err.message || "No se pudo crear la cuenta");
    }
  };

  const signInWithGoogle = async () => {
    try {
      await supabase.auth.signInWithOAuth({ provider: "google" });
    } catch (err) {
      setErrorMsg(err.message || "Error OAuth");
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
    } catch (err) {
      console.error("Error signout", err);
    }
  };

  // Mostrar pantalla de Login/Registro cuando no hay sesión
  if (!session || !session.user) {
    return (
      <div className="min-h-screen w-full bg-[#111214] text-neutral-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#0F1112] border border-neutral-800 rounded-2xl p-6">
          <h2 className="text-xl font-black mb-4">Iniciar sesión / Registrarse</h2>
          <form onSubmit={handleSignIn} className="flex flex-col gap-3">
            <input name="email" type="email" placeholder="Email" autoComplete="email" required className="w-full min-h-[44px] bg-[#121315] border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white" />
            <input name="password" type="password" placeholder="Contraseña" autoComplete="current-password" required className="w-full min-h-[44px] bg-[#121315] border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white" />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-amber-500 text-black font-bold py-2 rounded-lg">Iniciar sesión</button>
              <button type="button" onClick={handleSignUp} className="flex-1 bg-neutral-800 text-neutral-300 font-bold py-2 rounded-lg">Registrarme</button>
            </div>
          </form>
          <div className="mt-4">
            <button onClick={signInWithGoogle} className="w-full bg-white text-black font-bold py-2 rounded-lg">Iniciar con Google</button>
          </div>
          {errorMsg && <div className="mt-3 text-sm text-red-400">{errorMsg}</div>}
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen w-full overflow-x-hidden bg-[#111214] text-neutral-100 font-sans pb-16 mobile-tight">
      {loadingRoutine && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(17,18,20,0.6)' }}>
          <div className="bg-[#0F1112] border border-neutral-800 rounded-lg p-4">Cargando rutina...</div>
        </div>
      )}
      <div className="px-4 pt-6 pb-4 border-b border-neutral-800 sticky top-0 bg-[#111214]/95 backdrop-blur z-10 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-neutral-500 text-[11px] uppercase tracking-[0.2em] font-semibold mb-1">
            <Dumbbell size={13} strokeWidth={2.5} />
            Rutina Personalizable
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight leading-none truncate">
            {day.label}
            <span className="ml-2 text-base font-bold" style={{ color: plate.hex }}>
              {plate.sub}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-neutral-300 mr-2 truncate">{session?.user?.email}</div>
          <button onClick={() => setShowProfile(true)} className="min-h-[36px] px-2 py-1 rounded border bg-[#1B1D21] text-neutral-300 text-xs">Perfil</button>
          <button onClick={() => setShowAnalytics(true)} className="min-h-[36px] px-2 py-1 rounded border bg-[#1B1D21] text-neutral-300 text-xs">Analíticas</button>
          
          <button
            onClick={() => {
              setIsEditMode(!isEditMode);
              setEditingEx(null);
            }}
            className={`min-h-[44px] px-3 py-2 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all ${
              isEditMode
                ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                : "bg-[#1B1D21] border-neutral-800 text-neutral-400 hover:text-white"
            }`}
          >
            <Settings size={16} />
            {isEditMode ? "Listo" : "Editar"}
          </button>
          <button onClick={handleSignOut} className="min-h-[44px] px-3 py-2 rounded-xl border bg-[#1B1D21] text-neutral-300 text-xs">Cerrar Sesión</button>
        </div>
      </div>
      {errorMsg && (
        <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 90 }}>
          <div className="bg-red-600 text-white px-4 py-2 rounded shadow">{errorMsg}</div>
        </div>
      )}

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
              className="shrink-0 min-h-[44px] flex items-center gap-2 rounded-full pl-1.5 pr-3.5 py-2 border transition-colors"
              style={{
                borderColor: active ? p.hex : "#2a2c30",
                backgroundColor: active ? `${p.hex}1A` : "transparent",
              }}
            >
              <span
                className="flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-black"
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
                className="w-full min-h-[44px] bg-[#26282D] border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-neutral-400 font-semibold uppercase">Grupo Muscular</label>
              <select
                name="muscle_group"
                defaultValue={editingEx?.muscle_group || EXERCISE_MUSCLE_MAP[editingEx?.id] || "Pecho"}
                required
                className="w-full min-h-[44px] bg-[#26282D] border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option>Pecho</option>
                <option>Espalda</option>
                <option>Hombro</option>
                <option>Bíceps</option>
                <option>Tríceps</option>
                <option>Pierna</option>
                <option>Otros</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-neutral-400 font-semibold uppercase">Series</label>
                <input
                  name="sets"
                  type="number"
                  defaultValue={editingEx?.sets || 3}
                  required
                  className="w-full min-h-[44px] bg-[#26282D] border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 font-semibold uppercase">Reps Obj.</label>
                <input
                  name="reps"
                  defaultValue={editingEx?.reps || "10-12"}
                  required
                  className="w-full min-h-[44px] bg-[#26282D] border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-neutral-400 font-semibold uppercase">RIR</label>
                <input
                  name="rir"
                  defaultValue={editingEx?.rir || "1-2"}
                  className="w-full min-h-[44px] bg-[#26282D] border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 font-semibold uppercase">Descanso</label>
                <input
                  name="rest"
                  defaultValue={editingEx?.rest || "90s"}
                  className="w-full min-h-[44px] bg-[#26282D] border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                className="flex-1 min-h-[44px] bg-amber-500 text-black font-bold py-2 rounded-lg text-xs uppercase"
              >
                {editingEx ? "Guardar Cambios" : "Añadir Ejercicio"}
              </button>
              {editingEx && (
                <button
                  type="button"
                  onClick={() => setEditingEx(null)}
                  className="min-h-[44px] bg-neutral-800 text-neutral-300 font-bold px-3 py-2 rounded-lg text-xs"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      )}

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
              className="rounded-2xl bg-[#1B1D21] border border-neutral-800 overflow-hidden w-full"
              style={{ borderLeftColor: plate.hex, borderLeftWidth: 3 }}
            >
              <div className="w-full flex items-center justify-between gap-2 px-3 sm:px-4 py-3.5">
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => setExpanded(isOpen ? null : ex.id)}
                >
                  <div className="font-bold text-[15px] leading-snug pr-2 break-words">{ex.name}</div>
                  <div className="text-neutral-500 text-xs mt-0.5 tabular-nums break-words">
                    {ex.sets}×{ex.reps} · RIR {ex.rir} · descanso {ex.rest}
                  </div>
                  <div className="text-xs mt-1 tabular-nums flex items-center gap-1 break-words" style={{ color: plate.hex }}>
                    {last
                      ? `Última vez (${displayDate(last.date)}): ${last.sets.map((s) => `${s.weight}kg×${s.reps}`).join(", ")}`
                      : "Sin registros previos"}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isEditMode ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingEx(ex)}
                        className="min-h-[44px] min-w-[44px] p-2 text-amber-400 bg-amber-500/10 rounded-lg"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteExercise(ex.id)}
                        className="min-h-[44px] min-w-[44px] p-2 text-red-400 bg-red-500/10 rounded-lg"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowHistoryModal(ex.id)}
                        className="min-h-[44px] min-w-[44px] p-2 text-neutral-400 hover:text-white bg-[#26282D] rounded-lg"
                        title="Ver Historial Completo"
                      >
                        <History size={16} />
                      </button>

                      <span
                        className="text-[11px] font-bold rounded-full px-2 py-1 tabular-nums cursor-pointer min-h-[32px] flex items-center justify-center"
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

              {isOpen && !isEditMode && (
                <div className="px-4 pb-4 border-t border-neutral-800 pt-3">
                  {performanceAlert && expanded === ex.id && (
                    <div className="mb-3 text-sm bg-yellow-500/10 border border-yellow-600/20 text-yellow-300 rounded-lg p-2">{performanceAlert}</div>
                  )}
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
                    <div className="flex-1 min-w-0">
                      <label className="text-[10px] uppercase tracking-wide text-neutral-500 font-semibold">Kg</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={draft.weight}
                        onChange={(e) => setDrafts((p) => ({ ...p, [ex.id]: { ...draft, weight: e.target.value } }))}
                        placeholder="0"
                        className="w-full mt-1 min-h-[44px] bg-[#26282D] border border-neutral-700 rounded-lg px-3 py-2.5 text-base font-bold tabular-nums outline-none focus:border-neutral-400"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="text-[10px] uppercase tracking-wide text-neutral-500 font-semibold">Reps</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={draft.reps}
                        onChange={(e) => setDrafts((p) => ({ ...p, [ex.id]: { ...draft, reps: e.target.value } }))}
                        placeholder="0"
                        className="w-full mt-1 min-h-[44px] bg-[#26282D] border border-neutral-700 rounded-lg px-3 py-2.5 text-base font-bold tabular-nums outline-none focus:border-neutral-400"
                      />
                    </div>
                    <div style={{ width: 88 }}>
                      <label className="text-[10px] uppercase tracking-wide text-neutral-500 font-semibold">RIR</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={draft.rir || ""}
                        onChange={(e) => setDrafts((p) => ({ ...p, [ex.id]: { ...draft, rir: e.target.value } }))}
                        placeholder="RIR"
                        className="w-full mt-1 min-h-[44px] bg-[#26282D] border border-neutral-700 rounded-lg px-2 py-2 text-sm font-bold tabular-nums outline-none focus:border-neutral-400"
                      />
                    </div>
                    <div style={{ width: 160 }}>
                      <label className="text-[10px] uppercase tracking-wide text-neutral-500 font-semibold">Notas</label>
                      <input
                        type="text"
                        value={draft.notes || ""}
                        onChange={(e) => setDrafts((p) => ({ ...p, [ex.id]: { ...draft, notes: e.target.value } }))}
                        placeholder="Nota rápida"
                        className="w-full mt-1 min-h-[44px] bg-[#26282D] border border-neutral-700 rounded-lg px-2 py-2 text-sm font-bold outline-none focus:border-neutral-400"
                      />
                    </div>
                    <button
                      onClick={() => addSet(ex.id)}
                      className="shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg px-4 py-2.5 font-bold text-sm"
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

      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1B1D21] border border-neutral-800 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
            <div className="px-4 py-3.5 border-b border-neutral-800 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm text-neutral-100 break-words">
                  {routine.flatMap((d) => d.exercises).find((e) => e.id === showHistoryModal)?.name}
                </h3>
                <p className="text-xs text-neutral-500">Historial de entrenamientos pasados</p>
              </div>
              <button
                onClick={() => setShowHistoryModal(null)}
                className="min-h-[44px] min-w-[44px] p-1.5 text-neutral-400 hover:text-white"
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
      {showTimer && <RestTimer seconds={timerSeconds} onClose={() => setShowTimer(false)} />}
      {showProfile && session?.user && <ProfileModal onClose={() => setShowProfile(false)} user={session.user} />}
      {showAnalytics && session?.user && <Analytics onClose={() => setShowAnalytics(false)} user={session.user} />}
    </>
  );
}
