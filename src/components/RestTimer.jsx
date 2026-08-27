import React, { useEffect, useRef, useState } from "react";

export default function RestTimer({ seconds = 90, onClose, vibrate = true, sound = true, inline = false, exerciseName = "" }) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [running, setRunning] = useState(true);
  const intervalRef = useRef(null);
  const alarmRef = useRef(null);

  useEffect(() => {
    if (!alarmRef.current) {
      alarmRef.current = new Audio('/alarm.m4a');
      alarmRef.current.preload = 'auto';
    }

    return () => {
      if (alarmRef.current) {
        alarmRef.current.pause();
        alarmRef.current.currentTime = 0;
      }
    };
  }, []);

  useEffect(() => {
    setTimeLeft(seconds);
  }, [seconds]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  useEffect(() => {
    if (timeLeft !== 0) return;
    try {
      clearInterval(intervalRef.current);
    } catch (e) {}
    setRunning(false);

    if (sound) {
      try {
        const audio = alarmRef.current || new Audio('/alarm.m4a');
        alarmRef.current = audio;
        audio.currentTime = 0;
        audio.volume = 0.9;
        audio.play().catch(() => {});
      } catch (e) {}
    }

    if (vibrate) {
      try {
        navigator.vibrate && navigator.vibrate([200, 100, 200]);
      } catch (e) {}
    }

    try {
      onClose && onClose();
    } catch (e) {}
  }, [timeLeft, sound, vibrate, onClose]);

  const formatted = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, "0")}`;

  if (inline) {
    return (
      <div className={`rounded-2xl border border-amber-500/40 bg-[#1B1B12] p-3 shadow-[0_0_18px_rgba(245,158,11,0.18)] ${running ? 'animate-[pulse_1.4s_ease-in-out_infinite]' : ''}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-300/80">Descanso</div>
            <div className="truncate text-sm font-bold text-white">{exerciseName || "Ejercicio"}</div>
          </div>
          <div className="text-lg font-black tabular-nums text-amber-300">{formatted}</div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button type="button" onClick={() => setTimeLeft((s) => s + 30)} className="flex-1 min-h-[36px] rounded-lg bg-neutral-800 px-2 py-1 text-xs font-bold text-neutral-200">+30s</button>
          <button type="button" onClick={() => setTimeLeft((s) => Math.max(0, s - 30))} className="flex-1 min-h-[36px] rounded-lg bg-neutral-800 px-2 py-1 text-xs font-bold text-neutral-200">-30s</button>
          <button type="button" onClick={() => setRunning((r) => !r)} className="flex-1 min-h-[36px] rounded-lg bg-neutral-700 px-2 py-1 text-xs font-bold text-white">{running ? "Pausar" : "Reanudar"}</button>
          <button type="button" onClick={() => onClose && onClose()} className="flex-1 min-h-[36px] rounded-lg bg-red-500/15 px-2 py-1 text-xs font-bold text-red-300">Cerrar</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", left: 12, right: 12, bottom: 12, zIndex: 60 }}>
      <div style={{ background: "#111214", border: "1px solid #2a2c30", padding: 12, borderRadius: 12, display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
        <div style={{ fontWeight: 700 }}>{formatted}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setTimeLeft((s) => s + 30)} style={{ padding: "6px 8px" }}>+30s</button>
          <button onClick={() => setTimeLeft((s) => Math.max(0, s - 30))} style={{ padding: "6px 8px" }}>-30s</button>
          <button onClick={() => setRunning((r) => !r)} style={{ padding: "6px 8px" }}>{running ? "Pausar" : "Reanudar"}</button>
          <button onClick={() => onClose && onClose()} style={{ padding: "6px 8px" }}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
