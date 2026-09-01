import React from 'react';

// Minimal non-DnD fallback list used when ExerciseList is imported but
// the app uses the full card markup in App.jsx. Keeps import surface
// small and avoids depending on the prototype ExerciseCard file.
export default function ExerciseList({ exercises = [], onReorder }) {
  return (
    <div role="list">
      {(exercises || []).map((ex) => (
        <div key={ex.id} className="rounded-2xl bg-[#1B1D21] border border-neutral-800 p-3 mb-2">
          <div className="font-bold">{ex.name || ex.exercise_name || ex.id}</div>
        </div>
      ))}
    </div>
  );
}
