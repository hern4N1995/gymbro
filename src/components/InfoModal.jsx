import React, { useRef } from 'react';
import useClickOutside from '../hooks/useClickOutside';

export default function InfoModal({ term, title, text, onClose }) {
  const containerRef = useRef(null);
  useClickOutside(containerRef, onClose, Boolean(term));
  if (!term) return null;
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" />
      <div ref={containerRef} className="relative bg-[#1B1D21] border border-neutral-800 rounded-2xl w-full max-w-md p-4 z-10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">{title || term}</h3>
            <p className="text-sm text-neutral-400 mt-1">{text}</p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">Cerrar</button>
        </div>
      </div>
    </div>
  );
}
