import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function ExerciseCard({ exercise }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: exercise.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.9 : 1,
    touchAction: 'pan-y'
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} role="listitem" aria-grabbed={isDragging}>
      <div className="exercise-card">
        <div className="exercise-title">{exercise.name || exercise.exercise_name || 'Ejercicio'}</div>
        <div className="exercise-meta">{exercise.reps || ''} {exercise.weight ? `- ${exercise.weight}` : ''}</div>
      </div>
    </div>
  );
}
