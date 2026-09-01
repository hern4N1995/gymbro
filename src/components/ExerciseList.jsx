import React, { useState } from 'react';
import { DndContext, useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import ExerciseCard from './ExerciseCard';

export default function ExerciseList({ exercises, onReorder }) {
  const [items, setItems] = useState(exercises.map(e => e.id));

  React.useEffect(() => {
    setItems(exercises.map(e => e.id));
  }, [exercises]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 400, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.indexOf(active.id);
    const newIndex = items.indexOf(over.id);
    const newItems = arrayMove(items, oldIndex, newIndex);
    setItems(newItems);

    // produce new exercises array ordered by newItems
    const newExercises = newItems.map(id => exercises.find(e => e.id === id));
    if (onReorder) onReorder(newExercises);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div role="list">
          {exercises.map(ex => (
            <ExerciseCard key={ex.id} exercise={ex} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
