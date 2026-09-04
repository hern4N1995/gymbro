import React, { useState, useEffect, useCallback, useRef } from "react";
import { ChevronDown, Plus, Trash2, RotateCcw, Dumbbell, X, Check, Edit3, Settings, Calendar, History, ListPlus, Pencil, Timer, MoreVertical, User, GripVertical } from "lucide-react";
import InfoModal from "./src/components/InfoModal";
import { PrimaryButton, SecondaryButton } from "./src/components/Button";
import supabase from "./supabaseClient";
import RestTimer from "./src/components/RestTimer";
import ProfileModal from "./src/components/ProfileModal";
import Analytics from "./src/components/Analytics";
import ExerciseList from "./src/components/ExerciseList";
import useClickOutside from "./src/hooks/useClickOutside";
import { restDefaultByExercise, estimate1RM, volumeSeries } from "./src/utils/fitnessHelpers";
import EXERCISE_MUSCLE_MAP from "./src/config/muscleMapping";
import { DndContext, useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// DragHandle removed: listeners/attributes applied to the card container instead

// Small wrapper component that encapsulates the dnd-kit hook usage so
// the parent component doesn't call hooks dynamically inside a loop.
function SortableItem({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const transformStyle = { transform: CSS.Transform.toString(transform), transition };
  return children({ attributes, listeners, setNodeRef, transformStyle, isDragging });
}

// Configuración visual por día
const PLATE = {
  lun: { hex: "#D7263D", label: "25", sub: "Empuje A" },
  mar: { hex: "#1E6FD9", label: "20", sub: "Tracción A" },
  mie: { hex: "#F2C230", label: "15", sub: "Pierna" },
  jue: { hex: "#2E9E5B", label: "10", sub: "Empuje B" },
  vie: { hex: "#C9CDD3", label: "5", sub: "Tracción B" },
  sab: { hex: "#8B5CF6", label: "S", sub: "Sábado" },
  dom: { hex: "#FB7185", label: "D", sub: "Domingo" },
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
  {
    id: "sab",
    label: "Sábado",
    exercises: [],
  },
  {
    id: "dom",
    label: "Domingo",
    exercises: [],
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

const normalizeRestValue = (value) => {
  if (value == null || value === '') return '90s';
  const raw = String(value).trim().toLowerCase();
  if (!raw) return '90s';

  const matchSingle = raw.match(/^(\d+(?:\.\d+)?)\s*(s|sec|secs|seg|segundos?)$/);
  if (matchSingle) return `${Number(matchSingle[1])}s`;

  const matchRangeSeconds = raw.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(s|sec|secs|seg|segundos?)$/);
  if (matchRangeSeconds) {
    const a = Number(matchRangeSeconds[1]);
    const b = Number(matchRangeSeconds[2]);
    return `${Math.min(a, b)}-${Math.max(a, b)}s`;
  }

  const matchSingleMinutes = raw.match(/^(\d+(?:\.\d+)?)\s*(min|mins|minute|minutos?)$/);
  if (matchSingleMinutes) return `${Number(matchSingleMinutes[1]) * 60}s`;

  const matchRangeMinutes = raw.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(min|mins|minute|minutos?)$/);
  if (matchRangeMinutes) {
    const a = Number(matchRangeMinutes[1]) * 60;
    const b = Number(matchRangeMinutes[2]) * 60;
    return `${Math.min(a, b)}-${Math.max(a, b)}s`;
  }

  const matchSingleMinutesWithSec = raw.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*(min|mins|minute|minutos?)\s*(?:\s*\(\s*?\d+\s*s\s*\)?)?$/);
  if (matchSingleMinutesWithSec) {
    const a = Number(matchSingleMinutesWithSec[1]) * 60;
    const b = Number(matchSingleMinutesWithSec[2]) * 60;
    return `${Math.min(a, b)}-${Math.max(a, b)}s`;
  }

  const matchNumberOnly = raw.match(/^(\d+(?:\.\d+)?)$/);
  if (matchNumberOnly) return `${Number(matchNumberOnly[1])}s`;

  return raw;
};

const formatRestLabel = (value) => {
  const normalized = normalizeRestValue(value);
  if (!normalized || normalized === 'undefined') return '90s';
  if (normalized.includes('-')) {
    const [a, b] = normalized.replace(/s/g, '').split('-').map((n) => Number(n));
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return `${Math.round(a)}-${Math.round(b)}s`;
    }
  }
  const num = Number(String(normalized).replace(/[^\d.]/g, ''));
  if (Number.isFinite(num)) return `${Math.round(num)}s`;
  return normalized;
};

const defaultDayId = () => {
  const map = { 0: "dom", 1: "lun", 2: "mar", 3: "mie", 4: "jue", 5: "vie", 6: "sab" };
  return map[new Date().getDay()] || "lun";
};

const getWeekDateNumberForDayId = (dayId) => {
  // Calculate the date number (day of month) for the current week's dayId (lun..dom)
  const mapIndex = { lun: 1, mar: 2, mie: 3, jue: 4, vie: 5, sab: 6, dom: 0 };
  const targetIndex = mapIndex[dayId] ?? 1;
  const today = new Date();
  // Compute Monday of current week
  const monday = new Date(today);
  const dayOfWeek = today.getDay(); // 0 (Sun) - 6 (Sat)
  const offsetToMonday = (dayOfWeek + 6) % 7; // 0 if Monday
  monday.setDate(today.getDate() - offsetToMonday);
  // monday is Monday; compute target date
  const base = new Date(monday);
  const add = (targetIndex + 6) % 7; // convert 1..6,0 -> 0..6 offset relative to Monday
  base.setDate(monday.getDate() + add);
  return base.getDate();
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
  const [routine, setRoutine] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [history, setHistory] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingEx, setEditingEx] = useState(null);
  const [showManageDay, setShowManageDay] = useState(false);
  const [showCreateDaySheet, setShowCreateDaySheet] = useState(false);
  const [createDayId, setCreateDayId] = useState('');
  const [createDayTitle, setCreateDayTitle] = useState('');
  const [manageSelectedDay, setManageSelectedDay] = useState(null);
  const [manageDayTitle, setManageDayTitle] = useState('');
  const [dayActionMenu, setDayActionMenu] = useState(null);
  const [dayTitles, setDayTitles] = useState({});
  const [drafts, setDrafts] = useState({});
  const [errorMsg, setErrorMsg] = useState("");
  const [noticeMsg, setNoticeMsg] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [passwordChecks, setPasswordChecks] = useState({ length: false, letters: false, numbers: false });
  const [passwordValid, setPasswordValid] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [session, setSession] = useState(null);
  const [sessionStatus, setSessionStatus] = useState('verifying'); // 'verifying' | 'none' | 'authenticated'
  const tokenRefreshedResolversRef = React.useRef([]);
  const reloadFromSupabaseRef = React.useRef(null);

  const waitForTokenRefresh = (timeout = 2000) => {
    return new Promise((resolve) => {
      const resolved = { done: false };
      const timer = setTimeout(() => {
        if (resolved.done) return;
        resolved.done = true;
        resolve(false);
      }, timeout);
      const resolver = () => {
        if (resolved.done) return;
        resolved.done = true;
        clearTimeout(timer);
        resolve(true);
      };
      tokenRefreshedResolversRef.current.push(resolver);
    });
  };
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [showTimer, setShowTimer] = useState(false);
  const [activeTimerExercise, setActiveTimerExercise] = useState(null);
  const [timerOpts, setTimerOpts] = useState({ vibrate: true, sound: true });
  const [restConfigs, setRestConfigs] = useState({});
  const [timerConfigOpen, setTimerConfigOpen] = useState(null); // exerciseId
  const [timerConfigTemp, setTimerConfigTemp] = useState({ seconds: 0, vibrate: true, sound: true });
  const [timerConfirmExercise, setTimerConfirmExercise] = useState(null);
  const timerLongPressRef = React.useRef(null);
  const timerSuppressClickRef = React.useRef(false);
  const timerPointerStartRef = React.useRef(null);
  const timerDragDetectedRef = React.useRef(false);
  const [loadingRoutine, setLoadingRoutine] = useState(false);
  const [info, setInfo] = useState(null);
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

  useEffect(() => {
    if (!noticeMsg) return;
    const id = setTimeout(() => setNoticeMsg(''), 6000);
    return () => clearTimeout(id);
  }, [noticeMsg]);

  useEffect(() => {
    const p = String(signupPassword || '');
    const length = p.length >= 8;
    const letters = /[A-Za-z]/.test(p);
    const numbers = /\d/.test(p);
    setPasswordChecks({ length, letters, numbers });
    setPasswordValid(length && letters && numbers);
  }, [signupPassword]);
  const [showProfile, setShowProfile] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showSaveTemplateSheet, setShowSaveTemplateSheet] = useState(false);
  const [showLoadTemplateSheet, setShowLoadTemplateSheet] = useState(false);
  const [selectedTemplateForLoad, setSelectedTemplateForLoad] = useState(null);
  const [pendingTemplateToLoadAfterSave, setPendingTemplateToLoadAfterSave] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const MAX_TEMPLATE_SLOTS = 2;
  const TEMPLATE_SLOT_OPTIONS = Array.from({ length: MAX_TEMPLATE_SLOTS }, (_, index) => index + 1);
  const [saveTemplateSlot, setSaveTemplateSlot] = useState(1);
  const [templateRenameValue, setTemplateRenameValue] = useState('');
  const [renamingTemplateId, setRenamingTemplateId] = useState(null);
  
  const [backExitNotice, setBackExitNotice] = useState('');
  const [backExitNoticeVisible, setBackExitNoticeVisible] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuReady, setMenuReady] = useState(false);
  const [performanceAlert, setPerformanceAlert] = useState(null);
  const pillsRef = React.useRef(null);
  const [showRightFade, setShowRightFade] = useState(false);
  const rafRef = React.useRef(null);
  const exitPromptTimerRef = React.useRef(null);
  const [openFromManage, setOpenFromManage] = useState(false);
  const [exerciseMenuOpen, setExerciseMenuOpen] = useState(null);
  const exerciseMenuRefs = React.useRef({});
  const exerciseMenuPanelRef = React.useRef(null);
  const radialMenuRef = React.useRef(null);
  const radialMenuTriggerRef = React.useRef(null);
  const expandedRefs = React.useRef({});
  const suppressClickAfterModalCloseRef = React.useRef(false);

  const createDayRef = React.useRef(null);
  const manageDayRef = React.useRef(null);
  const editExRef = React.useRef(null);
  const historyModalRef = React.useRef(null);
  const timerConfirmRef = React.useRef(null);
  const timerConfigRef = React.useRef(null);
  const templateManagerRef = React.useRef(null);

  useClickOutside(createDayRef, () => setShowCreateDaySheet(false), showCreateDaySheet);
  useClickOutside(manageDayRef, () => setShowManageDay(false), showManageDay);
  useClickOutside(editExRef, () => { setEditingEx(null); setIsEditMode(false); setExpanded(null); setOpenFromManage(false); }, isEditMode);
  useClickOutside(historyModalRef, () => setShowHistoryModal(null), Boolean(showHistoryModal));
  useClickOutside(timerConfirmRef, () => { setTimerConfirmExercise(null); suppressClickAfterModalCloseRef.current = true; setTimeout(() => { suppressClickAfterModalCloseRef.current = false; }, 350); }, Boolean(timerConfirmExercise));
  useClickOutside(timerConfigRef, () => setTimerConfigOpen(null), Boolean(timerConfigOpen));
  useClickOutside(templateManagerRef, () => setShowTemplateManager(false), Boolean(showTemplateManager));

  useEffect(() => {
    let t = null;
    if (menuOpen) {
      setMenuReady(false);
      t = setTimeout(() => setMenuReady(true), 260);
    } else {
      setMenuReady(false);
    }
    return () => { if (t) clearTimeout(t); };
  }, [menuOpen]);

  const closeTopLevelOverlay = useCallback(() => {
    if (showCreateDaySheet) {
      setShowCreateDaySheet(false);
      return true;
    }
    if (showManageDay) {
      setShowManageDay(false);
      return true;
    }
    if (showProfile) {
      setShowProfile(false);
      return true;
    }
    if (showAnalytics) {
      setShowAnalytics(false);
      return true;
    }
    if (timerConfigOpen) {
      setTimerConfigOpen(null);
      return true;
    }
    if (showHistoryModal) {
      setShowHistoryModal(null);
      return true;
    }
    if (expanded) {
      setExpanded(null);
      return true;
    }
    if (dayActionMenu) {
      setDayActionMenu(null);
      return true;
    }
    if (exerciseMenuOpen) {
      setExerciseMenuOpen(null);
      return true;
    }
    if (menuOpen) {
      setMenuOpen(false);
      return true;
    }
    if (showTimer) {
      setShowTimer(false);
      setActiveTimerExercise(null);
      return true;
    }
    return false;
  }, [dayActionMenu, exerciseMenuOpen, menuOpen, showAnalytics, showCreateDaySheet, showHistoryModal, showManageDay, showProfile, showTimer, timerConfigOpen, expanded]);

  const pushHistoryState = useCallback(() => {
    try {
      window.history.pushState(null, '', window.location.href);
    } catch (e) {
      console.error('[pushHistoryState] failed', e);
    }
  }, []);
  // Keep a ref to the current backExitNotice so the popstate listener
  // doesn't need backExitNotice in its dependency array (avoids re-registering).
  const backExitNoticeRef = React.useRef(backExitNotice);
  useEffect(() => { backExitNoticeRef.current = backExitNotice; }, [backExitNotice]);

  // Register popstate listener once (or when closeTopLevelOverlay/pushHistoryState change).
  useEffect(() => {
    const handleBackButton = (event) => {
      event.preventDefault();
      const handled = closeTopLevelOverlay();
      if (handled) {
        pushHistoryState();
        return;
      }

      if (!backExitNoticeRef.current) {
        setBackExitNotice('Presioná atrás otra vez para salir');
        setBackExitNoticeVisible(true);
        pushHistoryState();
        return;
      }

      setBackExitNotice('');
      setBackExitNoticeVisible(false);
      if (exitPromptTimerRef.current) clearTimeout(exitPromptTimerRef.current);
      try {
        if (navigator.app && navigator.app.exitApp) {
          navigator.app.exitApp();
        } else if (window.close) {
          window.close();
        }
      } catch (e) {
        console.warn('No se pudo cerrar la app desde el navegador', e);
      }
    };

    pushHistoryState();
    window.addEventListener('popstate', handleBackButton);
    return () => {
      window.removeEventListener('popstate', handleBackButton);
      if (exitPromptTimerRef.current) clearTimeout(exitPromptTimerRef.current);
    };
  }, [closeTopLevelOverlay, pushHistoryState]);

  // Manage auto-close timeout for the back-exit toast separately so changes
  // to `backExitNotice` don't cause the popstate listener to be re-registered
  // and accidentally clear the timeout.
  useEffect(() => {
    if (!backExitNotice) return;
    if (exitPromptTimerRef.current) clearTimeout(exitPromptTimerRef.current);
    exitPromptTimerRef.current = setTimeout(() => {
      setBackExitNoticeVisible(false);
      setTimeout(() => setBackExitNotice(''), 350);
    }, 2000);
    return () => {
      if (exitPromptTimerRef.current) clearTimeout(exitPromptTimerRef.current);
    };
  }, [backExitNotice]);

  const dismissBackExitNotice = useCallback((immediate = false) => {
    if (exitPromptTimerRef.current) clearTimeout(exitPromptTimerRef.current);
    if (immediate) {
      setBackExitNoticeVisible(false);
      setBackExitNotice('');
      return;
    }
    setBackExitNoticeVisible(false);
    setTimeout(() => setBackExitNotice(''), 350);
  }, []);

  useEffect(() => {
    if (!backExitNotice) return;

    const handleOutsidePress = (event) => {
      const toast = document.getElementById('app-exit-toast');
      if (toast && toast.contains(event.target)) return;
      dismissBackExitNotice(true);
    };

    document.addEventListener('mousedown', handleOutsidePress);
    document.addEventListener('touchstart', handleOutsidePress, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handleOutsidePress);
      document.removeEventListener('touchstart', handleOutsidePress);
    };
  }, [backExitNotice, dismissBackExitNotice]);

  useEffect(() => {
    if (!exerciseMenuOpen) return;

    const handlePointerDown = (event) => {
      const trigger = exerciseMenuRefs.current[exerciseMenuOpen];
      const menuNode = exerciseMenuPanelRef.current;
      const target = event.target;

      if (trigger && trigger.contains(target)) return;
      if (menuNode && menuNode.contains(target)) return;

      setExerciseMenuOpen(null);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [exerciseMenuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event) => {
      const target = event.target;
      if (radialMenuTriggerRef.current && radialMenuTriggerRef.current.contains(target)) return;
      if (radialMenuRef.current && radialMenuRef.current.contains(target)) return;
      setMenuOpen(false);
      try {
        if (radialMenuTriggerRef.current && typeof radialMenuTriggerRef.current.blur === 'function') {
          radialMenuTriggerRef.current.blur();
        }
      } catch (e) {}
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!expanded) return;

    const handlePointerDown = (event) => {
      const target = event.target;
      const node = expandedRefs.current[expanded];
      if (node && node.contains(target)) return;
      setExpanded(null);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [expanded]);

  // Auth listener: mantiene `session` actualizado
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        setSessionStatus('verifying');
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        const sess = data?.session ?? null;
        setSession(sess);
        setSessionStatus(sess && sess.user ? 'authenticated' : 'none');
      } catch (e) {
        console.error("Error getting session", e);
        if (!mounted) return;
        setSession(null);
        setSessionStatus('none');
      }
    };
    init();

    const listener = supabase.auth.onAuthStateChange((_event, sess) => {
      // When tokens refresh or user signs in we may need to notify waiters
      // and reload remote data. Handle those events specially.
      if (_event === 'TOKEN_REFRESHED' || _event === 'SIGNED_IN') {
        try { (tokenRefreshedResolversRef.current || []).forEach(r => r()); } catch {}
        tokenRefreshedResolversRef.current = [];
        if (sess && sess.user && reloadFromSupabaseRef.current) {
          try { reloadFromSupabaseRef.current(sess.user.id, false); } catch (e) { console.warn('reloadFromSupabase failed', e); }
        }
        setSession(sess);
        setSessionStatus(sess && sess.user ? 'authenticated' : 'none');
        return;
      }

      // For other events, update status according to presence of user
      setSession(sess);
      if (sess && sess.user) setSessionStatus('authenticated');
      else setSessionStatus('none');
    });

    return () => {
      mounted = false;
      try { listener?.subscription?.unsubscribe?.(); } catch {}
    };
  }, []);

  // Detect overflow on the pills row to show a subtle fade indicating more content
  // Only show the fade when there is actually content out of view. Re-evaluate
  // on mount, when `routine` changes, on scroll, resize and DOM mutation.
  useEffect(() => {
    const tol = 2; // tolerance in px to avoid rounding glitches
    const getNode = () => pillsRef.current;

    const check = () => {
      const node = getNode();
      if (!node) return setShowRightFade(false);
      const scrollWidth = node.scrollWidth;
      const clientWidth = node.clientWidth;
      const scrollLeft = node.scrollLeft;
      const style = window.getComputedStyle(node);
      const paddingRight = parseFloat(style.paddingRight || '0') || 0;
      const rawDiff = scrollWidth - (clientWidth + scrollLeft);
      const FADE_RESERVED_PADDING = paddingRight || 24; // px reserved by pr-6
      const contentScrollWidth = Math.max(0, scrollWidth - FADE_RESERVED_PADDING);
      const contentRawDiff = contentScrollWidth - (clientWidth + scrollLeft);
      const needs = contentScrollWidth > (clientWidth + scrollLeft + tol);
      setShowRightFade(Boolean(needs));
    };

    // initial check
    check();

    const node = getNode();
    // Schedule checks via requestAnimationFrame to align with paint and avoid
    // reflow/render jitter when scrolling quickly.
    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        check();
      });
    };
    const onResize = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        check();
      });
    };
    if (node) node.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    const mo = node ? new MutationObserver(check) : null;
    if (mo && node) mo.observe(node, { childList: true, subtree: true });

    return () => {
      try { if (node) node.removeEventListener('scroll', onScroll); } catch {}
      try { window.removeEventListener('resize', onResize); } catch {}
      try { if (rafRef.current) cancelAnimationFrame(rafRef.current); } catch {}
      try { if (mo) mo.disconnect(); } catch {}
    };
  }, [routine]);

  // Load profile display name
  useEffect(() => {
    let mounted = true;
    const loadName = async () => {
      if (!session || !session.user) return setProfileName('');
      try {
        const { data } = await supabase.from('profiles').select('name').eq('id', session.user.id).maybeSingle();
        if (!mounted) return;
        const candidate = (data && data.name) || session.user.user_metadata?.full_name || '';
        if (candidate && candidate.trim()) {
          setProfileName(candidate);
        } else if (session.user.email) {
          // Derivar nombre desde email: nombre.apellido -> Nombre Apellido
          const local = session.user.email.split('@')[0] || session.user.email;
          const derived = local.replace(/[._]/g, ' ').split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
          setProfileName(derived);
        } else {
          setProfileName('Usuario');
        }
      } catch (e) {
        console.error('Error loading profile name', e);
        const fallback = session.user.user_metadata?.full_name || session.user.email || 'Usuario';
        setProfileName(fallback);
      }
    };
    loadName();
    return () => { mounted = false; };
  }, [session]);

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

    const loadFromSupabase = async (userId, tried = false) => {
      setLoadingRoutine(true);
      try {
        const { data, error } = await supabase.from("rutinas_usuario").select("*").eq("user_id", userId);
        if (error) throw error;

        // Always fetch day titles too — even if `rutinas_usuario` is empty we may have
        // entries in `dias_usuario` that should be shown as empty days.
        const { data: diasData } = await supabase.from('dias_usuario').select('*').eq('user_id', userId);
        const titleMap = (diasData || []).reduce((m, r) => { m[r.day_id] = r.title; return m; }, {});
        setDayTitles(titleMap);

        // Normalize fetched rows so UI uses exercise_id as `id` when present
        const normalized = uniqueById(((data || [])).map(r => ({ ...r, id: r.exercise_id || r.id })));

        // Determine which day_ids actually exist in the DB (either via exercises or via saved titles)
        const explicitDayIds = Array.from(new Set((normalized || []).map(r => r.day_id))).filter(Boolean);
        const titleOnlyIds = (diasData || []).map(d => d.day_id).filter(Boolean);
        const dayIds = Array.from(new Set([...(explicitDayIds || []), ...(titleOnlyIds || [])]));

        if (dayIds.length === 0) {
          // No exercises nor saved day titles in Supabase: for authenticated
          // users we want an empty routine (no preloaded DEFAULT_ROUTINE).
          setRoutine([]);
          setSelectedDay(null);
        } else {
          const labelMap = { lun: 'Lunes', mar: 'Martes', mie: 'Miércoles', jue: 'Jueves', vie: 'Viernes', sab: 'Sábado', dom: 'Domingo' };
          const grouped = dayIds.map(id => ({ id, label: labelMap[id] || id, exercises: uniqueById(normalized.filter(r => r.day_id === id)), sub: titleMap[id] || '' }));
          // Ensure exercises in each day are ordered by sort_order (fallback to id)
          const groupedWithOrder = grouped.map(g => ({
            ...g,
            exercises: (g.exercises || []).slice().sort((a, b) => {
              const aKey = (typeof a.sort_order === 'number') ? a.sort_order : a.id;
              const bKey = (typeof b.sort_order === 'number') ? b.sort_order : b.id;
              if (aKey < bKey) return -1;
              if (aKey > bKey) return 1;
              return 0;
            })
          }));
          const sortedRoutine = sortRoutine(groupedWithOrder);
          setRoutine(sortedRoutine);
        }
      } catch (e) {
        console.error("Error cargando rutina desde Supabase", e);
        // If it's an auth error (401), wait for token refresh (or short timeout) and retry once
        const status = e && (e.status || (e.response && e.response.status));
        if ((status === 401 || String(status) === '401') && !tried) {
          try {
            const refreshed = await waitForTokenRefresh(2000);
            // after waiting (either token refreshed or timeout) retry once
            return loadFromSupabase(userId, true);
          } catch (inner) {
            console.warn('Retry after token refresh failed', inner);
            setErrorMsg('Error cargando rutina: ' + (e.message || e));
            loadFromLocal();
          }
        } else {
          setErrorMsg('Error cargando rutina: ' + (e.message || e));
          loadFromLocal();
        }
      } finally {
        setLoadingRoutine(false);
      }
    };

    // expose reload function for TOKEN_REFRESHED handler
    reloadFromSupabaseRef.current = loadFromSupabase;

    if (sessionStatus === 'verifying') {
      // don't decide yet
    } else if (sessionStatus === 'authenticated' && session && session.user) {
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

  const day = routine.find((d) => d.id === selectedDay) || routine[0] || null;
  const plate = PLATE[selectedDay] || PLATE["lun"];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 400, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );


  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    // active.id and over.id are exercise ids within the current day
    const dayIdx = routine.findIndex((d) => d.id === (day && day.id));
    if (dayIdx < 0) return;
    const items = routine[dayIdx].exercises.map((e) => e.id);
    const oldIndex = items.indexOf(active.id);
    const newIndex = items.indexOf(over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const nextExercises = arrayMove(routine[dayIdx].exercises, oldIndex, newIndex);
    const nextRoutine = routine.map((d, i) => (i === dayIdx ? { ...d, exercises: nextExercises } : d));
    saveRoutineStructure(nextRoutine);
    // persistence to Supabase will be done in a later step
  };

  const handleDragStart = (event) => {
    // diagnostic removed: do not log here in production
  };

  const handleDragCancel = (event) => {
    // diagnostic removed: do not log here in production
  };

  const WEEK_ORDER = ['lun','mar','mie','jue','vie','sab','dom'];
  const DAY_LABEL_MAP = { lun: 'Lunes', mar: 'Martes', mie: 'Miércoles', jue: 'Jueves', vie: 'Viernes', sab: 'Sábado', dom: 'Domingo' };
  const WEEKDAY_OPTIONS = WEEK_ORDER.map((id) => ({ id, label: DAY_LABEL_MAP[id] || id }));
  const availableWeekdays = WEEK_ORDER.filter((id) => !routine.some((d) => d.id === id));
  const existingRoutineDays = routine.map((d) => ({ id: d.id, label: d.label }));
  const currentDayLabel = day ? String(day.label || '').toUpperCase() : '';
  const currentDaySub = day && day.sub ? String(day.sub).toUpperCase() : '';

  // Auto-select the most appropriate day after `routine` finishes loading.
  // Priority:
  // 1) If today's weekday exists in `routine`, select it.
  // 2) Otherwise pick the next chronological weekday that exists in `routine`,
  //    wrapping around the week if necessary.
  // 3) If `routine` is empty, leave selection as null.
  useEffect(() => {
    if (!routine || routine.length === 0) {
      if (selectedDay !== null) setSelectedDay(null);
      return;
    }

    // If the current selection is still valid, keep it.
    if (selectedDay && routine.some((d) => d.id === selectedDay)) return;

    const todayId = defaultDayId();
    // If today's day exists in the routine, pick it.
    if (routine.some((d) => d.id === todayId)) {
      setSelectedDay(todayId);
      return;
    }

    // Otherwise, scan forward through the week to find the next available day.
    const startIdx = WEEK_ORDER.indexOf(todayId);
    for (let i = 1; i < 7; i++) {
      const candidate = WEEK_ORDER[(startIdx + i) % 7];
      if (routine.some((d) => d.id === candidate)) {
        setSelectedDay(candidate);
        return;
      }
    }

    // Fallback: if for some reason nothing matched, pick the first available day.
    if (routine.length > 0) setSelectedDay(routine[0].id);
  }, [routine]);

  const sortRoutine = (arr) => {
    return [...arr].sort((a,b)=> WEEK_ORDER.indexOf(a.id) - WEEK_ORDER.indexOf(b.id));
  };

  const serializeCurrentRoutineSnapshot = (currentRoutine = routine, currentDayTitles = dayTitles) => {
    return (currentRoutine || []).map((day) => {
      const dayId = day?.id ?? null;
      const dayLabel = day?.label ?? '';
      const daySub = day?.sub ?? currentDayTitles[dayId] ?? '';

      return {
        id: dayId,
        label: dayLabel,
        sub: daySub,
        exercises: (day?.exercises || []).map((exercise) => {
          const originalExerciseId = exercise?.exercise_id ?? exercise?.id ?? null;
          return {
            id: originalExerciseId,
            exercise_id: originalExerciseId,
            day_id: dayId,
            name: exercise?.name ?? '',
            sets: exercise?.sets ?? 0,
            reps: exercise?.reps ?? '',
            rir: exercise?.rir ?? '',
            rest: exercise?.rest ?? '',
            muscle_group: exercise?.muscle_group ?? '',
          };
        }),
      };
    });
  };

  const loadTemplates = useCallback(async () => {
    if (!session || !session.user) {
      setTemplates([]);
      return;
    }

    const { data, error } = await supabase
      .from('routine_templates')
      .select('*')
      .eq('user_id', session.user.id)
      .order('slot_number', { ascending: true });

    if (error) {
      const missingTable = error?.code === 'PGRST205' || (typeof error?.message === 'string' && error.message.toLowerCase().includes('routine_templates'));
      if (missingTable) {
        setTemplates([]);
        return;
      }
      console.error('Error loading templates', error);
      setTemplates([]);
      return;
    }

    setTemplates(data || []);
  }, [session]);

  const saveTemplate = async (slotNumber = saveTemplateSlot, nameOverride = saveTemplateName) => {
    if (!session || !session.user) return false;
    const slot = Number(slotNumber);
    if (!Number.isInteger(slot) || slot < 1 || slot > MAX_TEMPLATE_SLOTS) {
      setErrorMsg(`Solo podés guardar ${MAX_TEMPLATE_SLOTS} rutinas.`);
      return false;
    }

    const name = (nameOverride || '').trim() || 'Rutina';
    const existingSlotNumbers = new Set((templates || []).map((template) => Number(template.slot_number)).filter(Number.isFinite));
    if (existingSlotNumbers.size >= MAX_TEMPLATE_SLOTS && !existingSlotNumbers.has(slot)) {
      setErrorMsg(`Solo podés guardar ${MAX_TEMPLATE_SLOTS} rutinas.`);
      return false;
    }

    const { error } = await supabase
      .from('routine_templates')
      .upsert({
        user_id: session.user.id,
        slot_number: slot,
        name,
        days: serializeCurrentRoutineSnapshot(routine, dayTitles),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,slot_number' });

    if (error) {
      const missingTable = error?.code === 'PGRST205' || (typeof error?.message === 'string' && error.message.toLowerCase().includes('routine_templates'));
      if (missingTable) {
        setErrorMsg('La tabla de plantillas no existe todavía. Ejecutá el SQL de creación antes de usar “Mis rutinas”.');
      } else {
        setErrorMsg('No se pudo guardar la plantilla.');
      }
      return false;
    }

    await loadTemplates();
    return true;
  };

  const renameTemplate = async (templateId, nextName) => {
    if (!session || !session.user) return false;

    const name = (nextName || '').trim();
    if (!name) return false;

    const { error } = await supabase
      .from('routine_templates')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', templateId)
      .eq('user_id', session.user.id);

    if (error) {
      const missingTable = error?.code === 'PGRST205' || (typeof error?.message === 'string' && error.message.toLowerCase().includes('routine_templates'));
      if (missingTable) {
        setErrorMsg('La tabla de plantillas no existe todavía. Ejecutá el SQL de creación antes de usar “Mis rutinas”.');
      } else {
        setErrorMsg('No se pudo renombrar la plantilla.');
      }
      return false;
    }

    await loadTemplates();
    return true;
  };

  const deleteTemplate = async (templateId) => {
    if (!session || !session.user) return false;

    const { error } = await supabase
      .from('routine_templates')
      .delete()
      .eq('id', templateId)
      .eq('user_id', session.user.id);

    if (error) {
      const missingTable = error?.code === 'PGRST205' || (typeof error?.message === 'string' && error.message.toLowerCase().includes('routine_templates'));
      if (missingTable) {
        setErrorMsg('La tabla de plantillas no existe todavía. Ejecutá el SQL de creación antes de usar “Mis rutinas”.');
      } else {
        setErrorMsg('No se pudo borrar la plantilla.');
      }
      return false;
    }

    await loadTemplates();
    return true;
  };

  const handleLoadTemplate = async (template) => {
    if (!session || !session.user) return;

    try {
      const { error } = await supabase.rpc('replace_active_routine_from_template', {
        p_user_id: session.user.id,
        p_template_id: template.id,
      });

      if (error) {
        const missingFn = typeof error?.message === 'string' && error.message.toLowerCase().includes('replace_active_routine_from_template');
        if (missingFn) {
          setErrorMsg('La función para cargar plantillas no existe todavía. Ejecutá el SQL del RPC de Supabase antes de usar “Mis rutinas”.');
        } else {
          setErrorMsg('La plantilla no se cargó. Tu rutina activa NO se modificó porque la operación falló y la transacción se revirtió.');
        }
        return;
      }

      if (reloadFromSupabaseRef.current) {
        await reloadFromSupabaseRef.current(session.user.id);
      }

      setShowLoadTemplateSheet(false);
      setSelectedTemplateForLoad(null);
      setPendingTemplateToLoadAfterSave(null);
      setErrorMsg('Plantilla cargada correctamente.');
    } catch (e) {
      setErrorMsg('La plantilla no se cargó. Tu rutina activa NO se modificó porque la operación falló y la transacción se revirtió.');
    }
  };

  const hasActiveRoutineContent = (currentRoutine = routine) => {
    return Array.isArray(currentRoutine) && currentRoutine.some((day) => Array.isArray(day?.exercises) && day.exercises.length > 0);
  };

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const addDay = (dayId, title = '') => {
    if (routine.find(d=>d.id===dayId)) return;
    const newDay = { id: dayId, label: DAY_LABEL_MAP[dayId] || dayId, sub: title || '', exercises: [] };
    const newRoutine = sortRoutine([...routine, newDay]);
    saveRoutineStructure(newRoutine);
    setSelectedDay(dayId);
  };

  const openCreateDaySheet = () => {
    const nextAvailable = WEEK_ORDER.filter((id) => !routine.some((d) => d.id === id));
    if (!nextAvailable.length) {
      setErrorMsg('Ya usaste todos los weekdays disponibles.');
      return;
    }
    setCreateDayId(nextAvailable[0]);
    setCreateDayTitle('');
    setShowCreateDaySheet(true);
  };

  const openManageDaySheet = (dayId = null) => {
    if (!routine.length) return;
    const current = dayId || selectedDay || routine[0]?.id || null;
    if (!current) return;
    setManageSelectedDay(current);
    setManageDayTitle((current && (dayTitles[current] ?? routine.find((d) => d.id === current)?.sub ?? '')) || '');
    setShowManageDay(true);
    setIsEditMode(false);
    setEditingEx(null);
    setExpanded(null);
  };

  const longPressTimerRef = React.useRef(null);
  const suppressClickRef = React.useRef(false);
  const pillPointerStartRef = React.useRef(null);
  const pillDragDetectedRef = React.useRef(false);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const closeDayActionMenu = () => {
    setDayActionMenu(null);
  };

  const openDayActionMenu = (dayId) => {
    setDayActionMenu(dayId);
  };

  const startLongPress = (event, dayId) => {
    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      suppressClickRef.current = true;
      setSelectedDay(dayId);
      try {
        const container = pillsRef?.current;
        const anchor = container ? container.querySelector(`[data-pill-day-id="${dayId}"]`) : document.querySelector(`[data-pill-day-id="${dayId}"]`);
        if (container && anchor) {
          const cRect = container.getBoundingClientRect();
          const aRect = anchor.getBoundingClientRect();
          // space reserved on right for the Add button and padding
          const reservedRight = 96; // matches paddingRight used earlier
          const visibleRight = cRect.right - reservedRight;
          // if anchor's right edge is beyond visibleRight - threshold, scroll left
          const threshold = 12;
          if (aRect.right > (visibleRight - threshold)) {
            const delta = Math.ceil(aRect.right - (visibleRight - threshold));
            // limit how far we shift so it doesn't move too much
            const maxShift = 48;
            const shift = Math.min(delta + 8, maxShift);
            // scroll container to the right (increasing scrollLeft) so the anchor moves left
            container.scrollBy({ left: shift, behavior: 'smooth' });
            // open menu after a short delay to let scrolling finish
            setTimeout(() => openDayActionMenu(dayId), 180);
            return;
          }
        }
      } catch (e) {
        // ignore
      }
      openDayActionMenu(dayId);
    }, 500);
  };

  const endLongPress = () => {
    clearLongPressTimer();
  };

  const handlePillPointerDown = (event, dayId) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    try { event.preventDefault(); event.stopPropagation(); } catch (e) {}
    pillPointerStartRef.current = { x: event.clientX, y: event.clientY };
    pillDragDetectedRef.current = false;
    try { event.target?.setPointerCapture?.(event.pointerId); } catch (e) {}
    startLongPress(event, dayId);
  };

  const handlePillPointerMove = (event) => {
    if (!pillPointerStartRef.current || !event) return;
    const dx = Math.abs(event.clientX - pillPointerStartRef.current.x || 0);
    const dy = Math.abs(event.clientY - pillPointerStartRef.current.y || 0);
    if (dx > 10 || dy > 10) {
      pillDragDetectedRef.current = true;
      endLongPress();
    }
  };

  const handlePillPointerUp = (event) => {
    try { event.target?.releasePointerCapture?.(event.pointerId); } catch (e) {}
    const wasDragged = pillDragDetectedRef.current;
    pillDragDetectedRef.current = false;
    pillPointerStartRef.current = null;
    endLongPress();
  };

  const handlePillPointerCancel = (event) => {
    try { event.target?.releasePointerCapture?.(event.pointerId); } catch (e) {}
    pillDragDetectedRef.current = false;
    pillPointerStartRef.current = null;
    endLongPress();
  };

  useEffect(() => {
    if (!dayActionMenu) return;

    const handlePointerDown = (event) => {
      const menuEl = document.getElementById(`day-action-row-${dayActionMenu}`);
      const anchorEl = document.querySelector(`[data-pill-day-id="${dayActionMenu}"]`);
      const target = event.target;
      if (menuEl && !menuEl.contains(target) && (!anchorEl || !anchorEl.contains(target))) {
        closeDayActionMenu();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [dayActionMenu]);

  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, []);

  const handlePillClick = (dayId) => {
    // pill click; suppressClickRef handled above
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    setSelectedDay(dayId);
    setExpanded(null);
    setEditingEx(null);
  };


  // Pointer event handlers replace mouse/touch handlers to avoid duplicate/synthesized events.
  // See handlePillPointerDown/Move/Up/Cancel above.

  const handlePillContextMenu = (event, dayId) => {
    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = true;
    openDayActionMenu(dayId);
  };

  const handleEditFromDayAction = (dayId) => {
    closeDayActionMenu();
    openManageDaySheet(dayId);
  };

  const handleDeleteFromDayAction = (dayId) => {
    closeDayActionMenu();
    removeDay(dayId);
  };

  const handleAddExerciseFromDayAction = (dayId) => {
    closeDayActionMenu();
    setSelectedDay(dayId);
    setOpenFromManage(false);
    setIsEditMode(true);
    setEditingEx(null);
    setExpanded(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateDay = async (e) => {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    const dayId = fd.get('new_day_id') || createDayId;
    const title = String(fd.get('new_day_title') || createDayTitle || '').trim();
    if (!dayId) return;
    if (routine.find(d=>d.id===dayId)) {
      setErrorMsg('Ese día ya existe en la rutina.');
      return;
    }
    const nextRoutine = sortRoutine([...routine, { id: String(dayId), label: DAY_LABEL_MAP[String(dayId)] || String(dayId), sub: title, exercises: [] }]);
    // If user is logged, attempt to persist title in Supabase first. Only
    // update local state if the upsert succeeds. For local-only users,
    // proceed optimistically.
    if (session && session.user) {
      try {
        const { error } = await supabase.from('dias_usuario').upsert({ user_id: session.user.id, day_id: String(dayId), title: title || '' }, { onConflict: ['user_id','day_id'] });
        if (error) throw error;
        // Persist locally and update UI only after remote save succeeded
        saveRoutineStructure(nextRoutine);
        setSelectedDay(String(dayId));
        setShowCreateDaySheet(false);
        setCreateDayId('');
        setCreateDayTitle('');
      } catch (e) {
        console.error('No se pudo persistir el día en Supabase', e);
        setErrorMsg('No se pudo guardar el día en la nube. Reintentá más tarde.');
        // Do NOT touch local state here: keep the sheet open so the user can retry.
      }
    } else {
      // Local-only workflow
      addDay(String(dayId), title);
      setShowCreateDaySheet(false);
      setCreateDayId('');
      setCreateDayTitle('');
    }
  };

  const removeDay = async (dayId) => {
    const ok = window.confirm(`Eliminar "${(routine.find(d=>d.id===dayId)||{}).label || dayId}" y sus ejercicios?`);
    if (!ok) return;
    // If user has session, remove rows from Supabase for that day
    if (session && session.user) {
      try {
        const { error } = await supabase.from('rutinas_usuario').delete().eq('user_id', session.user.id).eq('day_id', dayId);
        if (error) throw error;
        // Remove stored day title as well
        try {
          await supabase.from('dias_usuario').delete().eq('user_id', session.user.id).eq('day_id', dayId);
        } catch (e) {
          console.warn('No se pudo eliminar título de día en BD', e);
        }
      } catch (e) {
        console.error('Error eliminando día en Supabase', e);
        setErrorMsg('No se pudo eliminar el día en la nube.');
        return;
      }
      // Also remove the day from local routine structure and persist
      const newRoutine = routine.filter((d) => d.id !== dayId);
      saveRoutineStructure(newRoutine);
    } else {
      const newRoutine = routine.filter((d) => d.id !== dayId);
      saveRoutineStructure(newRoutine);
    }
    if (selectedDay === dayId) setSelectedDay((routine.find(r=>r.id!==dayId) || {}).id || null);
  };

  useEffect(() => {
    if (!day) {
      setHistory((prev) => ({ ...prev }));
      return;
    }
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
        // Do not auto-start rest timer after saving a set.
        // Timer should be started manually by the user per exercise.
        const restSec = restDefaultByExercise(exObj?.name || "");

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
    const dayId = formData.get("day_id") || selectedDay;
    // day titles are managed separately in 'Gestionar días'
    const sets = parseInt(formData.get("sets"), 10);
    const reps = formData.get("reps");
    const rir = formData.get("rir");
    const rest = normalizeRestValue(formData.get("rest"));
    const formMuscle = formData.get("muscle_group") || EXERCISE_MUSCLE_MAP[editingEx?.id] || 'Otros';

    if (!name) return;

    if (session && session.user) {
      try {
        if (editingEx && editingEx.id) {
          const exerciseKey = editingEx.exercise_id || editingEx.id;
          const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
          const isUuid = String(editingEx.id).match(uuidRegex);

          let existingMatchQuery = supabase
            .from("rutinas_usuario")
            .select("id, exercise_id, day_id, user_id")
            .eq("user_id", session.user.id);

          if (isUuid) {
            existingMatchQuery = existingMatchQuery.eq("id", editingEx.id);
          } else {
            existingMatchQuery = existingMatchQuery.eq("exercise_id", exerciseKey).eq("day_id", dayId);
          }

          const { data: existingMatches, error: existingErr } = await existingMatchQuery;
          if (existingErr) throw existingErr;

          if (existingMatches && existingMatches.length > 0) {
            const targetRowId = existingMatches[0].id;
            const { error: updErr } = await supabase
              .from("rutinas_usuario")
              .update({
                name,
                exercise_name: name,
                sets,
                reps,
                rir,
                rest,
                day_id: dayId,
                muscle_group: formMuscle,
              })
              .eq("id", targetRowId)
              .eq("user_id", session.user.id);

            if (updErr) throw updErr;
          } else {
            const newExerciseId = `${dayId}-${Date.now()}`;
            const toInsert = { user_id: session.user.id, day_id: dayId, exercise_id: newExerciseId, name, exercise_name: name, sets, reps, rir, rest, muscle_group: formMuscle };
            const { error: insErr } = await supabase.from("rutinas_usuario").insert(toInsert);
            if (insErr) throw insErr;
          }
        } else {
          // Insertar nuevo ejercicio en Supabase
          const newExerciseId = `${dayId}-${Date.now()}`;
          const toInsert = { user_id: session.user.id, day_id: dayId, exercise_id: newExerciseId, name, exercise_name: name, sets, reps, rir, rest, muscle_group: formMuscle };
          const { data: inserted, error: insErr } = await supabase
            .from("rutinas_usuario")
            .insert(toInsert)
            .select()
            .single();
          if (insErr) throw insErr;
        }

        // Day titles are managed in 'Gestionar días'.

        // Refrescar toda la rutina desde Supabase y mostrar sólo los day_id presentes
        const { data, error } = await supabase.from("rutinas_usuario").select("*").eq("user_id", session.user.id);
        if (error) throw error;
        const { data: diasData } = await supabase.from('dias_usuario').select('*').eq('user_id', session.user.id);
        const titleMap = (diasData || []).reduce((m, r) => { m[r.day_id] = r.title; return m; }, {});
        const normalized = uniqueById((data || []).map(r => ({ ...r, id: r.exercise_id || r.id })));
        const explicitDayIds = Array.from(new Set((normalized || []).map(r => r.day_id))).filter(Boolean);
        const titleOnlyIds = (diasData || []).map(d => d.day_id).filter(Boolean);
        const dayIds = Array.from(new Set([...(explicitDayIds || []), ...(titleOnlyIds || [])]));
        const labelMap = { lun: 'Lunes', mar: 'Martes', mie: 'Miércoles', jue: 'Jueves', vie: 'Viernes', sab: 'Sábado', dom: 'Domingo' };
        if (dayIds.length === 0) {
          // No day ids found after saving — avoid showing DEFAULT_ROUTINE here
          // as it can introduce weekdays the user didn't create (race condition
          // on reads). Keep routine empty and select the target day.
          setRoutine([]);
          setSelectedDay(dayId);
        } else {
          const grouped = dayIds.map(id => ({ id, label: labelMap[id] || id, exercises: uniqueById(normalized.filter(r => r.day_id === id)), sub: titleMap[id] || '' }));
          const sorted = sortRoutine(grouped);
          setRoutine(sorted);
          setSelectedDay(dayId);
        }
        setIsEditMode(false);
      } catch (err) {
        console.error("Error guardando ejercicio en Supabase", err);
        const msg = err?.message || (err && typeof err === 'string' ? err : JSON.stringify(err));
        setErrorMsg("No se pudo guardar el ejercicio en la nube: " + msg);
      } finally {
        setEditingEx(null);
        setOpenFromManage(false);
      }
    } else {
      // Fallback local: remove edited exercise from any day, then add/update in target dayId
      let base = routine.map((d) => ({ ...d, exercises: d.exercises.filter((ex) => !(editingEx && editingEx.id && ex.id === editingEx.id)) }));
      if (editingEx && editingEx.id) {
        // update existing (keep same id)
        base = base.map((d) => {
          if (d.id !== dayId) return d;
          return { ...d, exercises: [...d.exercises, { id: editingEx.id, name, sets, reps, rir, rest, muscle_group: formMuscle, day_id: dayId }] };
        });
      } else {
        const newId = `${dayId}-${Date.now()}`;
        base = base.map((d) => (d.id === dayId ? { ...d, exercises: [...d.exercises, { id: newId, name, sets, reps, rir, rest, muscle_group: formMuscle, day_id: dayId }] } : d));
      }

      // Titles are managed in 'Gestionar días'
      saveRoutineStructure(base);
      setEditingEx(null);
      setIsEditMode(false);
    }
  };

  const handleDeleteExercise = async (exId) => {
    const ok = window.confirm("¿Querés eliminar este ejercicio?");
    if (!ok) return;

    if (session && session.user) {
      try {
        // If exId is a numeric DB id, delete by `id`, otherwise delete by `exercise_id` string
        const isNumericId = String(exId).match(/^\d+$/);
        let res;
        if (isNumericId) {
          res = await supabase.from("rutinas_usuario").delete().eq("id", exId);
        } else {
          res = await supabase.from("rutinas_usuario").delete().eq("exercise_id", exId);
        }
        const { error } = res;
        if (error) throw error;
          // Refrescar desde Supabase y mostrar solo días presentes
          const { data } = await supabase.from('rutinas_usuario').select('*').eq('user_id', session.user.id);
          const { data: diasData } = await supabase.from('dias_usuario').select('*').eq('user_id', session.user.id);
          const titleMap = (diasData || []).reduce((m, r) => { m[r.day_id] = r.title; return m; }, {});
          const normalized = uniqueById((data || []).map(r => ({ ...r, id: r.exercise_id || r.id })));
          const explicitDayIds = Array.from(new Set((normalized || []).map(r => r.day_id))).filter(Boolean);
          const titleOnlyIds = (diasData || []).map(d => d.day_id).filter(Boolean);
          const dayIds = Array.from(new Set([...(explicitDayIds || []), ...(titleOnlyIds || [])]));
          const labelMap = { lun: 'Lunes', mar: 'Martes', mie: 'Miércoles', jue: 'Jueves', vie: 'Viernes', sab: 'Sábado', dom: 'Domingo' };
          if (dayIds.length === 0) {
            // Avoid injecting DEFAULT_ROUTINE here (could introduce weekdays the
            // user didn't create). Keep routine empty and pick a sensible selectedDay.
            setRoutine([]);
            const existingIds = [];
            if (!existingIds.includes(selectedDay)) setSelectedDay('lun');
          } else {
            const grouped = dayIds.map(id => ({ id, label: labelMap[id] || id, exercises: uniqueById(normalized.filter(r => r.day_id === id)), sub: titleMap[id] || '' }));
            const sorted = sortRoutine(grouped);
            setRoutine(sorted);
            const existingIds = sorted.map(g => g.id);
            if (!existingIds.includes(selectedDay)) setSelectedDay((sorted[0] && sorted[0].id) || 'lun');
          }
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

  

  const loadRestConfig = (exerciseId, exName) => {
    try {
      const raw = localStorage.getItem(`rest_config:${exerciseId}`);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { seconds: restDefaultByExercise(exName || ""), vibrate: true, sound: true };
  };

  const saveRestConfig = (exerciseId, cfg) => {
    try {
      localStorage.setItem(`rest_config:${exerciseId}`, JSON.stringify(cfg));
      setRestConfigs((p) => ({ ...p, [exerciseId]: cfg }));
    } catch (e) {}
  };

  const openTimerForExercise = (exerciseId, exName) => {
    const cfg = loadRestConfig(exerciseId, exName);
    setTimerSeconds(cfg.seconds);
    setTimerOpts({ vibrate: cfg.vibrate ?? true, sound: cfg.sound ?? true });
    setActiveTimerExercise(exerciseId);
    setShowTimer(true);
  };

  const startTimerButtonLongPress = (event, ex) => {
    if (event && event.button !== undefined && event.button !== 0) return;
    const point = event?.touches?.[0] || event;
    timerPointerStartRef.current = { x: point.clientX, y: point.clientY };
    timerDragDetectedRef.current = false;
    if (timerLongPressRef.current) clearTimeout(timerLongPressRef.current);
    timerLongPressRef.current = setTimeout(() => {
      timerSuppressClickRef.current = true;
      const cfg = loadRestConfig(ex.id, ex.name);
      setTimerConfigTemp(cfg);
      setTimerConfigOpen(ex.id);
    }, 500);
  };

  const endTimerButtonLongPress = () => {
    if (timerLongPressRef.current) {
      clearTimeout(timerLongPressRef.current);
      timerLongPressRef.current = null;
    }
  };

  const handleTimerPointerMove = (event) => {
    const point = event?.touches?.[0] || event;
    if (!timerPointerStartRef.current || !point) return;
    const deltaX = Math.abs(point.clientX - timerPointerStartRef.current.x);
    const deltaY = Math.abs(point.clientY - timerPointerStartRef.current.y);
    if (deltaX > 10 || deltaY > 10) {
      timerDragDetectedRef.current = true;
      endTimerButtonLongPress();
    }
  };

  const handleTimerPointerUp = (ex) => {
    const wasDragged = timerDragDetectedRef.current;
    timerDragDetectedRef.current = false;
    timerPointerStartRef.current = null;
    endTimerButtonLongPress();
    if (wasDragged) {
      timerSuppressClickRef.current = true;
      return;
    }
    if (timerSuppressClickRef.current) {
      timerSuppressClickRef.current = false;
      return;
    }
    setTimerConfirmExercise(ex);
  };

  const handleTimerButtonClick = (ex) => {
    if (timerSuppressClickRef.current) {
      timerSuppressClickRef.current = false;
      return;
    }
    setTimerConfirmExercise(ex);
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
    // password policy: min 8 chars, must include letters and numbers
    const pwd = String(password);
    const pwdOk = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(pwd);
    if (!pwdOk) {
      setErrorMsg('La contraseña debe tener mínimo 8 caracteres e incluir letras y números.');
      return;
    }
    try {
      const res = await supabase.auth.signUp({ email, password });
      console.log('supabase.signUp response', res);
      if (res.error) {
        setErrorMsg(res.error.message || 'Error al registrarse');
        return;
      }
      setNoticeMsg("Revisa tu correo para confirmar la cuenta antes de iniciar sesión.");
      setErrorMsg("");
      // clear password field for security
      try { formEl.querySelector('input[name=password]').value = ''; } catch {}
    } catch (err) {
      setErrorMsg(err.message || "No se pudo crear la cuenta");
    }
  };

  const signInWithGoogle = async () => {
    try {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!url || !key) {
        setErrorMsg('Google sign-in no está configurado: faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
        return;
      }
      await supabase.auth.signInWithOAuth({ provider: 'google' }, { redirectTo: window.location.origin });
    } catch (err) {
      console.error('signInWithGoogle error', err);
      setErrorMsg(err?.message || 'Error OAuth');
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
        <div className="flex flex-col items-center w-full -mt-14">
          <img src="/android-chrome-512x512.png" alt="GymBro logo" className="w-64 h-64 sm:w-80 sm:h-80 -mb-3 object-contain" />
          <div className="w-full max-w-md bg-[#0F1112] border border-neutral-800 rounded-2xl p-6">
            <h2 className="text-xl font-black mb-4">Iniciar sesión / Registrarse</h2>
            <form onSubmit={handleSignIn} className="flex flex-col gap-3">
              <input name="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} type="email" placeholder="Email" autoComplete="email" required className="w-full min-h-[44px] bg-[#121315] border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white" />
              <input name="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} type="password" placeholder="Contraseña" autoComplete="current-password" required className="w-full min-h-[44px] bg-[#121315] border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white" />
              <div className="text-xs text-neutral-500">La contraseña debe tener mínimo 8 caracteres e incluir letras y números.</div>
              <div className="flex gap-3 text-xs mt-1">
                <div className={`flex items-center gap-1 ${passwordChecks.length ? 'text-emerald-400' : 'text-neutral-500'}`}><Check size={14} />8+ caracteres</div>
                <div className={`flex items-center gap-1 ${passwordChecks.letters ? 'text-emerald-400' : 'text-neutral-500'}`}><Check size={14} />Letras</div>
                <div className={`flex items-center gap-1 ${passwordChecks.numbers ? 'text-emerald-400' : 'text-neutral-500'}`}><Check size={14} />Números</div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-amber-500 text-black font-bold py-2 rounded-lg">Iniciar sesión</button>
                <button type="button" onClick={handleSignUp} disabled={!passwordValid || !signupEmail} className={`flex-1 font-bold py-2 rounded-lg ${(!passwordValid || !signupEmail) ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed' : 'bg-neutral-800 text-neutral-300'}`}>Registrarme</button>
              </div>
            </form>
              <div className="mt-4">
              <button onClick={signInWithGoogle} className="w-full bg-white text-black font-bold py-2 rounded-lg flex items-center justify-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path fill="#EA4335" d="M24 9.5c3.9 0 6.6 1.7 8.1 3.1l6-6C34.9 3.6 29.9 1 24 1 14.9 1 7.3 6.8 3.7 14.8l7.1 5.5C12.8 15 17.9 9.5 24 9.5z"/><path fill="#34A853" d="M46.5 24.5c0-1.6-.1-2.9-.4-4.1H24v8.1h12.7c-.5 2.6-2 4.8-4.2 6.3l6.4 5c3.7-3.4 5.6-8.5 5.6-15.3z"/><path fill="#4A90E2" d="M10.8 28c-.7-2-1-4.1-1-6.2s.4-4.2 1-6.2L3.7 10.1C1.3 14 0 18.8 0 24s1.3 10 3.7 13.9l7.1-5.5z"/><path fill="#FBBC05" d="M24 46c6.6 0 12.2-2.2 16.4-6l-6.4-5c-2 1.4-4.6 2.2-8 2.2-6.1 0-11.2-5.5-12.5-12.7L3.7 34.9C7.3 42.9 14.9 48 24 48z"/></svg>
                  Iniciar con Google
              </button>
            </div>
            {/* gear removed from login view; appears after session starts */}
            {noticeMsg && <div className="mt-3 text-sm text-amber-400">{noticeMsg}</div>}
            {errorMsg && <div className="mt-3 text-sm text-red-400">{errorMsg}</div>}
          </div>
        </div>
      </div>
    );
  }

  // Si el usuario no tiene días creados, cortar el flujo antes de cualquier acceso a day.exercises.
  if (routine.length === 0) {
    return (
      <div className="min-h-screen w-full overflow-x-hidden bg-[#111214] text-neutral-100 font-sans pb-16 mobile-tight">
        <div className="relative px-4 pt-6 pb-4 border-b border-neutral-800 sticky top-0 bg-[#111214]/95 backdrop-blur z-10 flex flex-col sm:flex-row sm:items-center items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-neutral-500 text-[11px] uppercase tracking-[0.2em] font-semibold mb-3">
              <Dumbbell size={13} strokeWidth={2.5} className="text-neutral-500" />
              GYMBRO Rutinas
            </div>
            <div className="text-sm text-neutral-300">
              <div className="font-semibold">Bienvenido {profileName || 'Usuario'}</div>
              <div className="text-xs text-neutral-500">Hoy toca:</div>
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight leading-none truncate text-white">
              <span className="text-white">&nbsp;</span>
            </h1>
          </div>
        </div>

        <div className="mx-4 mt-4 rounded-2xl border border-dashed border-neutral-700 bg-[#1B1D21] p-5 text-center">
          <p className="text-sm font-semibold text-neutral-300">Todavía no tenés ningún día en tu rutina.</p>
          <p className="mt-1 text-xs text-neutral-500">Creá tu primer día para comenzar a planificar entrenamiento.</p>
          <button
            type="button"
            onClick={openCreateDaySheet}
            disabled={!availableWeekdays.length}
            className="mt-4 min-h-[44px] rounded-full bg-amber-500 px-4 py-2 text-xs font-bold uppercase text-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Crear primer día
          </button>
        </div>

        {showCreateDaySheet && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowCreateDaySheet(false);
            }}
          >
            <div ref={createDayRef} className="w-full max-w-md rounded-t-2xl border border-neutral-800 bg-[#1B1D21] p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-neutral-700" />
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-white">Crear día</h3>
                <button
                  type="button"
                  onClick={() => setShowCreateDaySheet(false)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-neutral-800 text-neutral-300 transition hover:bg-neutral-700 hover:text-white"
                  aria-label="Cerrar"
                >
                  <X size={18} className="shrink-0 leading-none" />
                </button>
              </div>
              <form onSubmit={handleCreateDay} className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">Día de la semana</label>
                  <select
                    name="new_day_id"
                    value={createDayId}
                    onChange={(e) => setCreateDayId(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-[#26282D] px-3 py-2 text-sm text-white"
                  >
                    {availableWeekdays.map((id) => (
                      <option key={id} value={id}>{DAY_LABEL_MAP[id] || id}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">Título</label>
                  <input
                    name="new_day_title"
                    value={createDayTitle}
                    onChange={(e) => setCreateDayTitle(e.target.value)}
                    placeholder="Ej: Empuje A"
                    className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-[#26282D] px-3 py-2 text-sm text-white"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowCreateDaySheet(false)} className="flex-1 min-h-[44px] rounded-xl bg-neutral-800 px-3 py-2 text-sm font-bold text-neutral-200">Cancelar</button>
                  <button type="submit" className="flex-1 min-h-[44px] rounded-xl bg-amber-500 px-3 py-2 text-sm font-bold text-black">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        )}
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
      <div className="relative px-4 pt-6 pb-4 border-b border-neutral-800 sticky top-0 bg-[#111214]/95 backdrop-blur z-10 flex flex-col sm:flex-row sm:items-center items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-neutral-500 text-[11px] uppercase tracking-[0.2em] font-semibold mb-3">
            <Dumbbell size={13} strokeWidth={2.5} className="text-neutral-500" />
            GYMBRO Rutinas
          </div>
            <div className="text-sm text-neutral-300">
              <div className="font-semibold">Bienvenido {profileName || 'Usuario'}</div>
              <div className="text-xs text-neutral-500">Hoy toca:</div>
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight leading-none truncate text-white">
              <span className="text-white">{currentDayLabel}</span>
              <span className="ml-2 text-base font-bold" style={{ color: plate.hex }}>
                {currentDaySub}
              </span>
            </h1>
        </div>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex items-center">
          <div className="relative flex items-center justify-center">
            <div
              ref={radialMenuRef}
              className="pointer-events-none absolute right-[-20px] top-1/2 -translate-y-1/2 flex items-center justify-center overflow-visible transition-[opacity,transform] duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
              style={{
                opacity: menuOpen ? 1 : 0,
                width: '120px',
                height: '120px',
                transform: `translate3d(${menuOpen ? '0px' : '12px'}, -60px, 0) scale(${menuOpen ? 1 : 0.35})`,
                transformOrigin: 'center center',
                pointerEvents: menuOpen ? 'auto' : 'none',
              }}
            >
              <div className="relative h-[120px] w-[120px] opacity-100 transition-opacity duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)] delay-75" style={{ opacity: menuOpen ? 1 : 0 }}>
                <button
                  type="button"
                  aria-label="Perfil"
                  onClick={() => { if (!menuReady) return; setShowProfile(true); setMenuOpen(false); }}
                  className="pointer-events-auto absolute left-1/2 top-0 flex items-center justify-center rounded-full border border-neutral-700 bg-[#111315] text-neutral-200 shadow-lg transition-all duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)] delay-75"
                  style={{
                    width: 32,
                    height: 32,
                    minWidth: 32,
                    minHeight: 32,
                    transform: menuOpen ? 'translateX(2px) translate(-50%, 0) scale(1)' : 'translateX(-6px) translate(-50%, 12px) scale(0.45)',
                    opacity: menuOpen ? 1 : 0,
                  }}
                >
                  <User size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Analíticas"
                  onClick={() => { if (!menuReady) return; setShowAnalytics(true); setMenuOpen(false); }}
                  className="pointer-events-auto absolute left-[18px] top-[26px] flex items-center justify-center rounded-full border border-neutral-700 bg-[#111315] text-neutral-200 shadow-lg transition-all duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)] delay-75"
                  style={{
                    width: 32,
                    height: 32,
                    minWidth: 32,
                    minHeight: 32,
                    transform: menuOpen ? 'translateX(2px) scale(1)' : 'translateX(10px) translateY(10px) scale(0.45)',
                    opacity: menuOpen ? 1 : 0,
                  }}
                >
                  <Calendar size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Mis rutinas"
                  onClick={() => { if (!menuReady) return; setShowTemplateManager(true); setMenuOpen(false); }}
                  className="pointer-events-auto absolute left-[18px] top-[62px] flex items-center justify-center rounded-full border border-amber-500/40 bg-[#1B1B12] text-amber-300 shadow-lg transition-all duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)] delay-75"
                  style={{
                    width: 32,
                    height: 32,
                    minWidth: 32,
                    minHeight: 32,
                    transform: menuOpen ? 'translateX(2px) scale(1)' : 'translateX(10px) translateY(14px) scale(0.45)',
                    opacity: menuOpen ? 1 : 0,
                  }}
                >
                  <ListPlus size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Cerrar sesión"
                  onClick={() => { if (!menuReady) return; handleSignOut(); setMenuOpen(false); }}
                  className="pointer-events-auto absolute left-1/2 bottom-0 flex items-center justify-center rounded-full border border-red-500/50 bg-[#1C171A] text-red-300 shadow-lg transition-all duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)] delay-75"
                  style={{
                    width: 32,
                    height: 32,
                    minWidth: 32,
                    minHeight: 32,
                    transform: menuOpen ? 'translateX(2px) translate(-50%, 0) scale(1)' : 'translateX(-6px) translate(-50%, 18px) scale(0.45)',
                    opacity: menuOpen ? 1 : 0,
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <button
              ref={radialMenuTriggerRef}
              type="button"
              aria-label="Opciones"
              onClick={() => setMenuOpen(!menuOpen)}
              className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full border border-neutral-700 bg-[#111315] text-neutral-200 shadow-lg transition-all duration-200 hover:bg-neutral-800 hover:text-white"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      </div>
      {errorMsg && (
        <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 90 }}>
          <div className="bg-red-600 text-white px-4 py-2 rounded shadow">{errorMsg}</div>
        </div>
      )}

          <div className="relative px-4">
            <div className="flex items-center gap-1 py-1">
              <div
                ref={pillsRef}
                className={`relative flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar ${routine.length <= 2 ? 'justify-center' : 'justify-start'}`}
                style={{ paddingRight: 96 }}
              >
                {routine.map((d) => {
                  const p = PLATE[d.id] || { hex: "#888", label: "P", sub: "" };
                  const active = d.id === selectedDay;
                  const isActionOpen = dayActionMenu === d.id;
                  return (
                    <div key={d.id} className="flex items-center -gap-1">
                      <button
                        type="button"
                        data-pill-day-id={d.id}
                        onClick={() => handlePillClick(d.id)}
                        onPointerDown={(event) => handlePillPointerDown(event, d.id)}
                        onPointerUp={handlePillPointerUp}
                        onPointerMove={handlePillPointerMove}
                        onPointerCancel={handlePillPointerCancel}
                        onContextMenu={(event) => handlePillContextMenu(event, d.id)}
                        className="relative z-0 shrink-0 min-h-[44px] min-w-[44px] flex items-center gap-2 rounded-full pl-1.5 pr-3.5 py-2 border transition-colors"
                        style={{
                          borderColor: active ? p.hex : "#2a2c30",
                          backgroundColor: active ? `${p.hex}1A` : "transparent",
                        }}
                      >
                        <span
                          className="flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-black"
                          style={{ backgroundColor: p.hex, color: p.hex === "#C9CDD3" || p.hex === "#F2C230" ? "#111214" : "#fff" }}
                        >
                          {getWeekDateNumberForDayId(d.id)}
                        </span>
                        <span className={`text-xs font-bold uppercase tracking-wide ${active ? "text-neutral-100" : "text-neutral-500"}`}>
                          {d.label.slice(0, 3)}
                        </span>
                      </button>

                      <div
                        id={`day-action-row-${d.id}`}
                        className="relative z-40 flex items-center justify-center overflow-hidden transition-[width,opacity] duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                        style={{ width: isActionOpen ? '34px' : '0px', opacity: isActionOpen ? 1 : 0, zIndex: 40 }}
                      >
                        <div className="relative h-[88px] w-[34px] px-0.5 opacity-100 transition-opacity duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)] delay-75" style={{ opacity: isActionOpen ? 1 : 0 }}>
                          <button
                            type="button"
                            aria-label="Editar día"
                            title="Editar día"
                            onClick={() => handleEditFromDayAction(d.id)}
                            className="absolute left-1/2 top-0 flex items-center justify-center rounded-full border border-neutral-700 bg-[#111315] text-neutral-200 shadow-lg transition-opacity duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)] delay-75"
                            style={{ width: 28, height: 28, minWidth: 28, minHeight: 28, transform: 'translateX(-2px) translate(-50%, 0)', opacity: isActionOpen ? 1 : 0 }}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            aria-label="Agregar ejercicio al día"
                            title="Agregar ejercicio"
                            onClick={() => handleAddExerciseFromDayAction(d.id)}
                            className="absolute left-1/2 top-1/2 flex items-center justify-center rounded-full border border-amber-500/40 bg-[#1B1B12] text-amber-300 shadow-lg transition-opacity duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)] delay-75"
                            style={{ width: 28, height: 28, minWidth: 28, minHeight: 28, transform: 'translateX(2px) translate(-50%, -50%)', opacity: isActionOpen ? 1 : 0 }}
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            type="button"
                            aria-label="Eliminar día"
                            title="Eliminar día"
                            onClick={() => handleDeleteFromDayAction(d.id)}
                            className="absolute left-1/2 bottom-0 flex items-center justify-center rounded-full border border-red-500/40 bg-[#1C171A] text-red-300 shadow-lg transition-opacity duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)] delay-75"
                            style={{ width: 28, height: 28, minWidth: 28, minHeight: 28, transform: 'translateX(-2px) translate(-50%, 0)', opacity: isActionOpen ? 1 : 0 }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}

                {/* Gradient overlay removed — revert to original layout */}
              </div>

                <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openCreateDaySheet}
                  disabled={!availableWeekdays.length}
                  aria-label="Añadir día"
                  className="relative z-20 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full pl-3 pr-3 py-2 border border-dashed border-neutral-700 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed bg-[#0F1112] shadow-lg"
                  style={{ backgroundColor: '#0F1112' }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>

      {!loadingRoutine && routine.length === 0 && (
        <div className="mx-4 mt-4 rounded-2xl border border-dashed border-neutral-700 bg-[#1B1D21] p-5 text-center">
          <p className="text-sm font-semibold text-neutral-300">Todavía no tenés ningún día en tu rutina.</p>
          <p className="mt-1 text-xs text-neutral-500">Creá tu primer día para comenzar a planificar entrenamiento.</p>
          <button
            type="button"
            onClick={openCreateDaySheet}
            disabled={!availableWeekdays.length}
            className="mt-4 min-h-[44px] rounded-full bg-amber-500 px-4 py-2 text-xs font-bold uppercase text-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Crear primer día
          </button>
        </div>
      )}

      {isEditMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={(e) => { if (e.target === e.currentTarget) { setEditingEx(null); setIsEditMode(false); setExpanded(null); setOpenFromManage(false); } }}>
          <div ref={editExRef} className="w-full max-w-md rounded-2xl bg-[#1B1D21] border border-amber-500/40 p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
              <Edit3 size={15} />
              {editingEx ? `Editando: ${editingEx.name}` : `Agregar nuevo ejercicio`}
            </h3>
            <form onSubmit={handleSaveExercise} className="flex flex-col gap-3">
              <input
                type="hidden"
                name="day_id"
                value={editingEx ? (editingEx.day_id || selectedDay || '') : (selectedDay || '')}
              />
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
                    defaultValue={formatRestLabel(editingEx?.rest) || "90s"}
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
                <button
                  type="button"
                  onClick={() => { setEditingEx(null); setIsEditMode(false); setExpanded(null); setOpenFromManage(false); }}
                  className="min-h-[44px] bg-neutral-800 text-neutral-300 font-bold px-3 py-2 rounded-lg text-xs"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showManageDay && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div ref={manageDayRef} className="w-full max-w-md rounded-t-2xl border border-neutral-800 bg-[#1B1D21] p-4 shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-neutral-700" />
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-white">Gestionar día</h3>
              <button
                type="button"
                onClick={() => setShowManageDay(false)}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-neutral-800 p-2 text-neutral-300 transition hover:bg-neutral-700 hover:text-white"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">Día</span>
                  <span className="text-xs font-semibold text-neutral-300">
                    {routine.find((d) => d.id === manageSelectedDay)?.label || 'Día'}
                  </span>
                </div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">Título del día</label>
                <input
                  value={manageDayTitle}
                  onChange={(ev) => setManageDayTitle(ev.target.value)}
                  placeholder="Ej: Empuje A"
                  className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-[#26282D] px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

              <div className="mt-4 space-y-2">
                <button
                  onClick={async () => {
                    if (!manageSelectedDay) return;
                    if (session && session.user) {
                      try {
                        await supabase.from('dias_usuario').upsert({ user_id: session.user.id, day_id: manageSelectedDay, title: manageDayTitle }, { onConflict: ['user_id','day_id'] });
                      } catch (e) {
                        console.warn('No se pudo guardar título de día', e);
                        setErrorMsg('No se pudo guardar título en la nube.');
                      }
                    }
                    setDayTitles(prev => ({ ...prev, [manageSelectedDay]: manageDayTitle }));
                    setRoutine(prev => prev.map(d => d.id === manageSelectedDay ? { ...d, sub: manageDayTitle } : d));
                    setShowManageDay(false);
                    setOpenFromManage(false);
                  }}
                className="w-full min-h-[44px] rounded-xl bg-amber-500 px-3 py-2 text-sm font-bold uppercase text-black"
              >
                Guardar título
              </button>

              <div className="space-y-2">
                <button
                  onClick={async () => {
                      if (!manageSelectedDay) return;
                      await removeDay(manageSelectedDay);
                      setShowManageDay(false);
                      setOpenFromManage(false);
                    }}
                  className="w-full min-h-[44px] rounded-xl bg-red-700 px-3 py-2 text-xs font-bold text-white"
                >
                  Eliminar día
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateDaySheet && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateDaySheet(false);
          }}
        >
          <div ref={createDayRef} className="w-full max-w-md rounded-t-2xl border border-neutral-800 bg-[#1B1D21] p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-neutral-700" />
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-white">Crear día</h3>
              <button
                type="button"
                onClick={() => setShowCreateDaySheet(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-neutral-800 text-neutral-300 transition hover:bg-neutral-700 hover:text-white"
                aria-label="Cerrar"
              >
                <X size={18} className="shrink-0 leading-none" />
              </button>
            </div>
            <form onSubmit={handleCreateDay} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">Día de la semana</label>
                <select
                  name="new_day_id"
                  value={createDayId}
                  onChange={(e) => setCreateDayId(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-[#26282D] px-3 py-2 text-sm text-white"
                >
                  {availableWeekdays.map((id) => (
                    <option key={id} value={id}>{DAY_LABEL_MAP[id] || id}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">Título</label>
                <input
                  name="new_day_title"
                  value={createDayTitle}
                  onChange={(e) => setCreateDayTitle(e.target.value)}
                  placeholder="Ej: Empuje A"
                  className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-[#26282D] px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowCreateDaySheet(false)} className="flex-1 min-h-[44px] rounded-xl bg-neutral-800 px-3 py-2 text-sm font-bold text-neutral-200">Cancelar</button>
                <button type="submit" className="flex-1 min-h-[44px] rounded-xl bg-amber-500 px-3 py-2 text-sm font-bold text-black">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div
        className="px-4 flex flex-col gap-3 mt-2"
        style={{
          touchAction: 'pan-y',
          overscrollBehavior: 'contain',
        }}
      >
        {day.exercises.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-700 bg-[#1B1D21] p-4 text-center">
            <p className="text-sm font-medium text-neutral-300">Este día todavía no tiene ejercicios</p>
          </div>
        ) : (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
            <SortableContext items={day.exercises.map((e) => e.id)} strategy={verticalListSortingStrategy}>
            {day.exercises.map((ex) => {
              const isOpen = expanded === ex.id;
              const todaySets = getTodaySets(ex.id);
              const last = getLastSession(ex.id);
              const draft = drafts[ex.id] || { weight: "", reps: "" };
              const doneCount = todaySets.length;
              const targetCount = ex.sets;
              const isDraggedCard = false;
              const isDropTarget = false;

              
              return (
                <SortableItem id={ex.id} key={ex.id}>
                  {({ attributes, listeners, setNodeRef, transformStyle, isDragging }) => (
                <div
                  data-exercise-card
                  data-exercise-id={ex.id}
                  ref={(node) => { setNodeRef(node); if (node) expandedRefs.current[ex.id] = node; else delete expandedRefs.current[ex.id]; }}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (suppressClickAfterModalCloseRef.current) {
                      suppressClickAfterModalCloseRef.current = false;
                      return;
                    }
                    if (exerciseMenuOpen === ex.id) { setExerciseMenuOpen(null); return; }
                    setExpanded(isOpen ? null : ex.id);
                  }}
                  className="rounded-2xl bg-[#1B1D21] border border-neutral-800 overflow-hidden w-full cursor-pointer transition-all"
                  style={{
                    borderLeftColor: plate.hex,
                    borderLeftWidth: 3,
                    opacity: isDragging ? 0.72 : 1,
                    transition: 'transform 180ms ease-out, box-shadow 180ms ease-out, border-color 180ms ease-out, background-color 180ms ease-out, filter 180ms ease-out',
                    touchAction: 'manipulation',
                    ...transformStyle,
                  }}
                >
                  <div className="w-full flex items-center justify-between gap-2 px-3 sm:px-4 py-3.5">
                    <div
                      className="mr-2 flex items-center shrink-0"
                      role="button"
                      tabIndex={0}
                      style={{
                        WebkitTouchCallout: 'none',
                        WebkitUserSelect: 'none',
                        userSelect: 'none',
                        touchAction: 'none',
                        pointerEvents: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      {...attributes}
                      {...listeners}
                      onPointerDown={(e) => {
                        if (listeners?.onPointerDown) listeners.onPointerDown(e);
                      }}
                    >
                      <GripVertical size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[15px] leading-snug pr-2 break-words">{ex.name}</div>
                      <div className="text-neutral-500 text-xs mt-0.5 tabular-nums break-words">
                        {ex.sets}×{ex.reps} · <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(event) => { event.stopPropagation(); setInfo({ term: 'RIR' }); }} className="underline text-neutral-400">RIR</button> {ex.rir} · descanso {formatRestLabel(ex.rest)}
                      </div>
                      <div className="text-xs mt-1 tabular-nums flex items-center gap-1 break-words" style={{ color: plate.hex }}>
                        {last
                          ? `Última vez (${displayDate(last.date)}): ${last.sets.map((s) => `${s.weight}kg×${s.reps}`).join(", ")}`
                          : "Sin registros previos"}
                      </div>
                    </div>

                    <div className="exercise-controls flex items-center gap-2 shrink-0" style={{ pointerEvents: 'none' }}>
                      <span
                        className="text-[11px] font-bold rounded-full px-2 py-1 tabular-nums cursor-pointer min-h-[32px] flex items-center justify-center"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (exerciseMenuOpen === ex.id) {
                            setExerciseMenuOpen(null);
                            return;
                          }
                          setExpanded(isOpen ? null : ex.id);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        style={{ pointerEvents: 'auto', backgroundColor: doneCount >= targetCount ? "#2E9E5B33" : "#2a2c30", color: doneCount >= targetCount ? "#59D98A" : "#9a9ca1" }}
                      >
                        {doneCount}/{targetCount}
                      </span>

                      <button
                        type="button"
                        style={{ pointerEvents: 'auto' }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => startTimerButtonLongPress(e, ex)}
                        onMouseMove={handleTimerPointerMove}
                        onMouseUp={() => handleTimerPointerUp(ex)}
                        onMouseLeave={() => {
                          endTimerButtonLongPress();
                          timerPointerStartRef.current = null;
                          timerDragDetectedRef.current = false;
                        }}
                        onTouchStart={(e) => startTimerButtonLongPress(e, ex)}
                        onTouchMove={handleTimerPointerMove}
                        onTouchEnd={() => handleTimerPointerUp(ex)}
                        onContextMenu={(e) => { e.preventDefault(); timerSuppressClickRef.current = true; setTimerConfigTemp(loadRestConfig(ex.id, ex.name)); setTimerConfigOpen(ex.id); }}
                        className="min-h-[44px] min-w-[44px] p-2 text-neutral-300 hover:text-white bg-[#26282D] rounded-full flex items-center justify-center"
                        title="Temporizador descanso"
                        aria-label={`Temporizador descanso para ${ex.name}`}
                      >
                        <Timer size={16} />
                      </button>

                      <div className="dropdown-root">
                        <button
                          type="button"
                          ref={(node) => {
                            if (node) exerciseMenuRefs.current[ex.id] = node;
                            else delete exerciseMenuRefs.current[ex.id];
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                          onMouseDown={(event) => event.stopPropagation()}
                          onTouchStart={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation();
                            setExerciseMenuOpen((current) => current === ex.id ? null : ex.id);
                          }}
                          className="min-h-[44px] min-w-[44px] p-2 text-neutral-300 hover:text-white bg-[#26282D] rounded-full flex items-center justify-center"
                          style={{ pointerEvents: 'auto' }}
                          aria-label={`Más opciones para ${ex.name}`}
                          title="Más opciones"
                        >
                          <MoreVertical size={18} />
                        </button>
                      </div>

                      <div
                        ref={exerciseMenuPanelRef}
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(event) => event.stopPropagation()}
                        onTouchStart={(event) => event.stopPropagation()}
                        className="relative z-10 flex items-center justify-center overflow-hidden transition-[width,opacity] duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                        style={{ width: exerciseMenuOpen === ex.id ? '34px' : '0px', opacity: exerciseMenuOpen === ex.id ? 1 : 0, zIndex: 10, pointerEvents: exerciseMenuOpen === ex.id ? 'auto' : 'none' }}
                      >
                        <div className="relative h-[88px] w-[34px] px-0.5 opacity-100 transition-opacity duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)] delay-75" style={{ opacity: exerciseMenuOpen === ex.id ? 1 : 0 }}>
                          <button
                            type="button"
                            aria-label="Editar ejercicio"
                            title="Editar ejercicio"
                            onPointerDown={(e) => e.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                            onTouchStart={(event) => event.stopPropagation()}
                            onClick={() => {
                              setEditingEx(ex);
                              setOpenFromManage(false);
                              setIsEditMode(true);
                              setExerciseMenuOpen(null);
                            }}
                            className="absolute left-1/2 top-0 flex items-center justify-center rounded-full border border-neutral-700 bg-[#111315] text-neutral-200 shadow-lg transition-opacity duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)] delay-75"
                            style={{ width: 28, height: 28, minWidth: 28, minHeight: 28, transform: 'translateX(-2px) translate(-50%, 0)', opacity: exerciseMenuOpen === ex.id ? 1 : 0 }}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            aria-label="Ver historial"
                            title="Ver historial"
                            onPointerDown={(e) => e.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                            onTouchStart={(event) => event.stopPropagation()}
                            onClick={() => {
                              setShowHistoryModal(ex.id);
                              setExerciseMenuOpen(null);
                            }}
                            className="absolute left-1/2 top-1/2 flex items-center justify-center rounded-full border border-neutral-700 bg-[#111315] text-neutral-200 shadow-lg transition-opacity duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)] delay-75"
                            style={{ width: 28, height: 28, minWidth: 28, minHeight: 28, transform: 'translateX(2px) translate(-50%, -50%)', opacity: exerciseMenuOpen === ex.id ? 1 : 0 }}
                          >
                            <History size={14} />
                          </button>
                          <button
                            type="button"
                            aria-label="Eliminar ejercicio"
                            title="Eliminar ejercicio"
                            onPointerDown={(e) => e.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                            onTouchStart={(event) => event.stopPropagation()}
                            onClick={() => {
                              handleDeleteExercise(ex.id);
                              setExerciseMenuOpen(null);
                            }}
                            className="absolute left-1/2 bottom-0 flex items-center justify-center rounded-full border border-red-500/40 bg-[#1C171A] text-red-300 shadow-lg transition-opacity duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)] delay-75"
                            style={{ width: 28, height: 28, minWidth: 28, minHeight: 28, transform: 'translateX(-2px) translate(-50%, 0)', opacity: exerciseMenuOpen === ex.id ? 1 : 0 }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      
                    </div>
                  </div>

                  {showTimer && activeTimerExercise === ex.id && (
                    <div className="px-3 pb-2">
                      <RestTimer
                        exerciseName={ex.name}
                        seconds={timerSeconds}
                        vibrate={timerOpts.vibrate}
                        sound={timerOpts.sound}
                        inline
                        onClose={() => {
                          setShowTimer(false);
                          setActiveTimerExercise(null);
                        }}
                      />
                    </div>
                  )}

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
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => removeLastSet(ex.id)}
                            className="flex items-center gap-1 text-xs text-neutral-500 hover:text-red-400 px-2 py-1.5"
                          >
                            <Trash2 size={12} /> última
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap items-end gap-2">
                        <div className="flex-1 min-w-0 w-full sm:w-auto">
                          <label className="text-[10px] uppercase tracking-wide text-neutral-500 font-semibold">Kg</label>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={draft.weight}
                            onChange={(e) => setDrafts((p) => ({ ...p, [ex.id]: { ...draft, weight: e.target.value } }))}
                            onPointerDown={(e) => e.stopPropagation()}
                            placeholder="0"
                            className="w-full mt-1 min-h-[44px] bg-[#26282D] border border-neutral-700 rounded-lg px-3 py-2.5 text-base font-bold tabular-nums outline-none focus:border-neutral-400"
                          />
                        </div>
                        <div className="flex-1 min-w-0 w-full sm:w-auto">
                          <label className="text-[10px] uppercase tracking-wide text-neutral-500 font-semibold">Reps</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={draft.reps}
                            onChange={(e) => setDrafts((p) => ({ ...p, [ex.id]: { ...draft, reps: e.target.value } }))}
                            onPointerDown={(e) => e.stopPropagation()}
                            placeholder="0"
                            className="w-full mt-1 min-h-[44px] bg-[#26282D] border border-neutral-700 rounded-lg px-3 py-2.5 text-base font-bold tabular-nums outline-none focus:border-neutral-400"
                          />
                        </div>
                        <div className="w-full sm:w-[88px]">
                          <label className="text-[10px] uppercase tracking-wide text-neutral-500 font-semibold">RIR</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={draft.rir || ""}
                            onChange={(e) => setDrafts((p) => ({ ...p, [ex.id]: { ...draft, rir: e.target.value } }))}
                            onPointerDown={(e) => e.stopPropagation()}
                            placeholder="RIR"
                            className="w-full mt-1 min-h-[44px] bg-[#26282D] border border-neutral-700 rounded-lg px-2 py-2 text-sm font-bold tabular-nums outline-none focus:border-neutral-400"
                          />
                        </div>
                        <div className="w-full sm:w-[160px]">
                          <label className="text-[10px] uppercase tracking-wide text-neutral-500 font-semibold">Notas</label>
                          <input
                            type="text"
                            value={draft.notes || ""}
                            onChange={(e) => setDrafts((p) => ({ ...p, [ex.id]: { ...draft, notes: e.target.value } }))}
                            onPointerDown={(e) => e.stopPropagation()}
                            placeholder="Nota rápida"
                            className="w-full mt-1 min-h-[44px] bg-[#26282D] border border-neutral-700 rounded-lg px-2 py-2 text-sm font-bold outline-none focus:border-neutral-400"
                          />
                        </div>
                        <button
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => addSet(ex.id)}
                          className="w-full sm:shrink-0 sm:min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg px-4 py-2.5 font-bold text-sm"
                          style={{ backgroundColor: plate.hex, color: plate.hex === "#C9CDD3" || plate.hex === "#F2C230" ? "#111214" : "#fff" }}
                        >
                          <Plus size={18} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                  )}
                </SortableItem>
              );
            })}

            </SortableContext>
          </DndContext>
        )}
      </div>

      {showHistoryModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowHistoryModal(null);
          }}
        >
          <div ref={historyModalRef} className="bg-[#1B1D21] border border-neutral-800 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3.5 border-b border-neutral-800 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm text-neutral-100 break-words">
                  {routine.flatMap((d) => d.exercises).find((e) => e.id === showHistoryModal)?.name}
                </h3>
                <p className="text-xs text-neutral-500">Historial de entrenamientos pasados</p>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(null)}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-neutral-800 p-2 text-neutral-300 transition hover:bg-neutral-700 hover:text-white"
                aria-label="Cerrar"
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

      <InfoModal
        term={info?.term}
        title={info?.term === 'RIR' ? 'RIR (Reps In Reserve)' : info?.term}
        text={info?.term === 'RIR' ? 'RIR (Reps In Reserve) indica cuántas repeticiones más podrías realizar al final de la serie. Ej: RIR 1 = podrías hacer 1 repetición más.' : ''}
        onClose={() => setInfo(null)}
      />

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

      {backExitNotice && (
        <div
          id="app-exit-toast"
          className="fixed inset-x-4 bottom-6 z-[80] flex justify-center transition-opacity duration-500 ease-out"
          style={{ opacity: backExitNoticeVisible ? 1 : 0 }}
          onClick={() => dismissBackExitNotice(true)}
        >
          <div className="rounded-full border border-neutral-700 bg-[#111214]/95 px-4 py-2 text-center text-[11px] font-medium text-neutral-200 shadow-lg backdrop-blur-sm">
            {backExitNotice}
          </div>
        </div>
      )}
    </div>
      {timerConfirmExercise && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
          onPointerDown={(e) => { if (e.target === e.currentTarget) { e.stopPropagation(); e.preventDefault(); setTimerConfirmExercise(null); suppressClickAfterModalCloseRef.current = true; setTimeout(() => { suppressClickAfterModalCloseRef.current = false; }, 350); } }}
        >
          <div ref={timerConfirmRef} className="w-full max-w-md rounded-2xl border border-neutral-800 bg-[#1B1D21] p-4 shadow-2xl" onPointerDown={(e) => e.stopPropagation()}>
            <div className="mb-3 text-sm font-bold text-white">Iniciar descanso</div>
            <p className="text-sm text-neutral-300">
              ¿Querés iniciar el temporizador para <span className="font-semibold text-white">{timerConfirmExercise.name}</span>?
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setTimerConfirmExercise(null)}
                className="flex-1 min-h-[44px] rounded-xl bg-neutral-800 px-3 py-2 text-sm font-bold text-neutral-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const ex = timerConfirmExercise;
                  setTimerConfirmExercise(null);
                  openTimerForExercise(ex.id, ex.name);
                }}
                className="flex-1 min-h-[44px] rounded-xl bg-amber-500 px-3 py-2 text-sm font-bold text-black"
              >
                Iniciar
              </button>
            </div>
          </div>
        </div>
      )}
      {timerConfigOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div ref={timerConfigRef} className="w-full max-w-md rounded-2xl border border-neutral-800 bg-[#1B1D21] p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-white">Configuración temporizador</div>
              <button type="button" onClick={() => setTimerConfigOpen(null)} className="min-h-[44px] min-w-[44px] rounded-full bg-neutral-800 inline-flex items-center justify-center text-neutral-300"><X size={18} /></button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] text-neutral-400 font-semibold uppercase">Segundos</label>
                <div className="flex items-center gap-2 mt-1">
                  <button onClick={() => setTimerConfigTemp((p) => ({ ...p, seconds: Math.max(0, (p.seconds || 0) - 15) }))} className="px-3 py-2 bg-neutral-800 rounded">-15s</button>
                  <input type="number" value={timerConfigTemp.seconds || 0} onChange={(e) => setTimerConfigTemp((p) => ({ ...p, seconds: Number(e.target.value) }))} className="w-full min-h-[44px] bg-[#26282D] border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white" />
                  <button onClick={() => setTimerConfigTemp((p) => ({ ...p, seconds: (p.seconds || 0) + 15 }))} className="px-3 py-2 bg-neutral-800 rounded">+15s</button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2"><input type="checkbox" checked={!!timerConfigTemp.vibrate} onChange={(e) => setTimerConfigTemp((p) => ({ ...p, vibrate: e.target.checked }))} /> Vibrar al finalizar</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={!!timerConfigTemp.sound} onChange={(e) => setTimerConfigTemp((p) => ({ ...p, sound: e.target.checked }))} /> Sonido al finalizar</label>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    saveRestConfig(timerConfigOpen, timerConfigTemp);
                    setTimerConfigOpen(null);
                  }}
                  className="flex-1 min-h-[44px] rounded-xl bg-amber-500 px-3 py-2 text-sm font-bold text-black"
                >Guardar</button>
                <button
                  onClick={() => {
                    saveRestConfig(timerConfigOpen, timerConfigTemp);
                    const ex = routine.flatMap((d) => d.exercises).find((e) => e.id === timerConfigOpen);
                    openTimerForExercise(timerConfigOpen, ex?.name || '');
                    setTimerConfigOpen(null);
                  }}
                  className="flex-1 min-h-[44px] rounded-xl bg-green-600 px-3 py-2 text-sm font-bold text-white"
                >Guardar y Iniciar</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showTemplateManager && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) setShowTemplateManager(false); }}>
          <div ref={templateManagerRef} className="w-full max-w-md rounded-t-2xl border border-neutral-800 bg-[#1B1D21] p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-neutral-700" />
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-white">Mis rutinas</h3>
              <button
                type="button"
                onClick={() => setShowTemplateManager(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-neutral-800 text-neutral-300 transition hover:bg-neutral-700 hover:text-white"
                aria-label="Cerrar"
              >
                <X size={18} className="shrink-0 leading-none" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-neutral-800 bg-[#131517] p-3">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">Guardar rutina actual</div>
                <div className="flex gap-2">
                  <input
                    value={saveTemplateName}
                    onChange={(e) => setSaveTemplateName(e.target.value)}
                    placeholder="Nombre de la rutina"
                    className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-[#26282D] px-3 py-2 text-sm text-white"
                  />
                  <select
                    value={saveTemplateSlot}
                    onChange={(e) => setSaveTemplateSlot(Number(e.target.value))}
                    className="min-h-[44px] rounded-xl border border-neutral-700 bg-[#26282D] px-2 py-2 text-sm text-white"
                  >
                    {TEMPLATE_SLOT_OPTIONS.map((slot) => (
                      <option key={slot} value={slot}>Slot {slot}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await saveTemplate();
                    if (ok) setShowTemplateManager(false);
                  }}
                  className="mt-3 w-full min-h-[44px] rounded-xl bg-amber-500 px-3 py-2 text-sm font-bold text-black"
                >
                  Guardar
                </button>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-[#131517] p-3">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">Plantillas guardadas</div>
                {templates.length === 0 ? (
                  <div className="text-sm text-neutral-400">Todavía no tenés plantillas guardadas.</div>
                ) : (
                  <div className="space-y-2">
                    {templates.map((template) => (
                      <div key={template.id} className="rounded-lg border border-neutral-700 bg-[#1A1C1F] p-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-white">{template.name || 'Rutina'}</div>
                            <div className="text-[10px] uppercase tracking-[0.12em] text-neutral-500">Slot {template.slot_number}</div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => handleLoadTemplate(template)}
                              className="min-h-[36px] rounded-lg bg-neutral-800 px-2 text-xs font-semibold text-neutral-200"
                            >
                              Cargar
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const nextName = window.prompt('Renombrar plantilla', template.name || 'Rutina');
                                if (nextName === null) return;
                                const ok = await renameTemplate(template.id, nextName);
                                if (ok) setShowTemplateManager(false);
                              }}
                              className="min-h-[36px] rounded-lg bg-neutral-800 px-2 text-xs font-semibold text-neutral-200"
                            >
                              Ren.
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (window.confirm('¿Borrar esta plantilla?')) {
                                  const ok = await deleteTemplate(template.id);
                                  if (ok) setShowTemplateManager(false);
                                }
                              }}
                              className="min-h-[36px] rounded-lg bg-red-900/35 px-2 text-xs font-semibold text-red-200"
                            >
                              Borrar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {showProfile && session?.user && <ProfileModal onClose={() => setShowProfile(false)} user={session.user} onSaved={(n)=>setProfileName(n)} />}
      {showAnalytics && session?.user && <Analytics onClose={() => setShowAnalytics(false)} user={session.user} />}
    </>
  );
}
