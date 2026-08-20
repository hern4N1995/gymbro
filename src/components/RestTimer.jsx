import React, { useEffect, useRef, useState } from "react";

export default function RestTimer({ seconds = 90, onClose }) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [running, setRunning] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    setTimeLeft(seconds);
  }, [seconds]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((t) => {
            if (t <= 1) {
              clearInterval(intervalRef.current);
              // beep and vibrate
            try {
              const ctx = new (window.AudioContext || window.webkitAudioContext)();
              const o = ctx.createOscillator();
              const g = ctx.createGain();
              o.type = "sine";
              o.frequency.value = 880;
              o.connect(g);
              g.connect(ctx.destination);
              o.start();
              g.gain.setValueAtTime(0.0001, ctx.currentTime);
              g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
              setTimeout(() => {
                g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
                o.stop();
              }, 300);
            } catch (e) {}
            try {
              navigator.vibrate && navigator.vibrate([200, 100, 200]);
            } catch (e) {}
              try {
                onClose && onClose();
              } catch (e) {}
              return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  return (
    <div style={{ position: "fixed", left: 12, right: 12, bottom: 12, zIndex: 60 }}>
      <div style={{ background: "#111214", border: "1px solid #2a2c30", padding: 12, borderRadius: 12, display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
        <div style={{ fontWeight: 700 }}>{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}</div>
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
