const MAP = [
  { keys: ["press", "banca", "pecho", "press banco"], muscle: "Pecho" },
  { keys: ["remo", "jalon", "jalón", "dominadas", "pull"], muscle: "Espalda" },
  { keys: ["press militar", "hombro", "elevación lateral", "elevacion lateral"], muscle: "Hombro" },
  { keys: ["curl", "bíceps", "biceps"], muscle: "Bíceps" },
  { keys: ["triceps", "tríceps", "extensión tríceps", "extensión triceps"], muscle: "Tríceps" },
  { keys: ["prensa", "sentadilla", "pierna", "femoral", "pantorrilla"], muscle: "Pierna" },
];

export const detectMuscle = (name = "") => {
  const n = (name || "").toLowerCase();
  for (const m of MAP) {
    for (const k of m.keys) {
      if (n.includes(k)) return m.muscle;
    }
  }
  return "Otros";
};
