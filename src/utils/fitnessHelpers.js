export const isCompoundExercise = (name = "") => {
  const n = name.toLowerCase();
  const compounds = [
    "press", "remo", "jalón", "prensa", "press militar", "press de hombro", "bench", "banca", "press banco", "remo",
  ];
  return compounds.some((k) => n.includes(k));
};

export const restDefaultByExercise = (name = "") => {
  return isCompoundExercise(name) ? 150 : 75;
};

export const estimate1RM = ({ weight, reps, rir }) => {
  const repsRealizadas = Number(reps) || 0;
  const rirVal = rir != null && rir !== "" ? Number(rir) : 1.5;
  const repsAFallo = repsRealizadas + (isNaN(rirVal) ? 1.5 : rirVal);
  if (repsRealizadas <= 12 && repsRealizadas > 0) {
    const rm = weight * (1 + repsAFallo / 30);
    return Math.round(rm * 10) / 10;
  }
  return null;
};

export const volumeSeries = ({ weight, reps }) => {
  return (Number(weight) || 0) * (Number(reps) || 0);
};

export const sumVolume = (seriesArray = []) => {
  return seriesArray.reduce((s, cur) => s + volumeSeries(cur), 0);
};
