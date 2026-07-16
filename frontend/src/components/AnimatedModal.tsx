import React, { useEffect, useState } from 'react';
import Portal from './Portal';

interface AnimatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string; // Optional custom className for the backdrop overlay (if needed)
  children: (animate: boolean) => React.ReactNode;
}

export default function AnimatedModal({ 
  isOpen, 
  onClose, 
  className = "fixed inset-0 z-55 flex items-start justify-center p-4 overflow-y-auto", 
  children 
}: AnimatedModalProps) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Small timeout to allow mounting to register in DOM before applying animate transition classes
      const timer = setTimeout(() => setAnimate(true), 20);
      return () => clearTimeout(timer);
    } else {
      setAnimate(false);
      // Delay unmounting by 200ms to allow exit CSS transitions to play in full
      const timer = setTimeout(() => setShouldRender(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Premium feature: Handle 'Escape' key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!shouldRender) return null;

  return (
    <Portal>
      <div 
        className={`${className} bg-slate-900/0 transition-all duration-200 ease-out ${
          animate ? 'bg-slate-900/40 opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      >
        {children(animate)}
      </div>
    </Portal>
  );
}
