import { useEffect } from 'react';

export default function useClickOutside(ref, onClose, isOpen) {
  useEffect(() => {
    if (!isOpen) return;

    const handlePointer = (event) => {
      try {
        const node = ref && ref.current;
        if (!node) return;
        const target = event.target;
        if (!node.contains(target)) {
          try { onClose && onClose(); } catch (e) {}
        }
      } catch (e) {}
    };

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer, { passive: true });

    // body scroll lock counting to avoid stomping other modals
    const body = document && document.body;
    if (body) {
      body.__modalOpenCount = (body.__modalOpenCount || 0) + 1;
      if (body.__modalOpenCount === 1) {
        body.__prevOverflow = body.style.overflow;
        body.style.overflow = 'hidden';
      }
    }

    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
      if (body) {
        body.__modalOpenCount = Math.max(0, (body.__modalOpenCount || 1) - 1);
        if (body.__modalOpenCount === 0) {
          try { body.style.overflow = body.__prevOverflow || ''; } catch (e) {}
          try { delete body.__prevOverflow; } catch (e) {}
        }
      }
    };
  }, [ref, onClose, isOpen]);
}
