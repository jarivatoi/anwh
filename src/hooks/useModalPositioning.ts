import { useState, useCallback, useRef, useEffect } from 'react';

interface ModalPosition {
  top: number;
  left: number;
  maxHeight: string;
}

interface UseModalPositioningOptions {
  modalWidth?: number;
  modalMaxHeight?: number;
  offsetY?: number;
  offsetX?: number;
}

export const useModalPositioning = (options: UseModalPositioningOptions = {}) => {
  const {
    modalWidth = 448, // 28rem = 448px
    modalMaxHeight = 600,
    offsetY = 20,
    offsetX = 0
  } = options;

  const [modalPosition, setModalPosition] = useState<ModalPosition | null>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);

  const calculateModalPosition = useCallback((triggerElement: HTMLElement): ModalPosition => {
    const rect = triggerElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate center position relative to the trigger element
    const triggerCenterX = rect.left + (rect.width / 2);
    const triggerCenterY = rect.top + (rect.height / 2);
    
    // Calculate modal position centered on the trigger element
    let modalLeft = triggerCenterX - (modalWidth / 2);
    let modalTop = triggerCenterY - (modalMaxHeight / 2) + offsetY;
    
    // Ensure modal stays within viewport bounds with padding
    const padding = 16;
    
    // Horizontal bounds checking
    if (modalLeft < padding) {
      modalLeft = padding;
    } else if (modalLeft + modalWidth > viewportWidth - padding) {
      modalLeft = viewportWidth - modalWidth - padding;
    }
    
    // Vertical bounds checking
    if (modalTop < padding) {
      modalTop = padding;
    } else if (modalTop + modalMaxHeight > viewportHeight - padding) {
      modalTop = viewportHeight - modalMaxHeight - padding;
    }
    
    // Calculate available height if modal is constrained
    const availableHeight = Math.min(modalMaxHeight, viewportHeight - modalTop - padding);
    
    console.log('📍 Modal positioning calculated:', {
      triggerRect: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
      triggerCenter: { x: triggerCenterX, y: triggerCenterY },
      modalPosition: { left: modalLeft, top: modalTop },
      viewport: { width: viewportWidth, height: viewportHeight },
      availableHeight
    });
    
    return {
      top: modalTop,
      left: modalLeft,
      maxHeight: `${availableHeight}px`
    };
  }, [modalWidth, modalMaxHeight, offsetY, offsetX]);

  const positionModal = useCallback((triggerElement: HTMLElement) => {
    triggerElementRef.current = triggerElement;
    const position = calculateModalPosition(triggerElement);
    setModalPosition(position);
  }, [calculateModalPosition]);

  const resetPosition = useCallback(() => {
    setModalPosition(null);
    triggerElementRef.current = null;
  }, []);

  // Recalculate position on window resize or scroll
  useEffect(() => {
    const handleReposition = () => {
      if (triggerElementRef.current && modalPosition) {
        const newPosition = calculateModalPosition(triggerElementRef.current);
        setModalPosition(newPosition);
      }
    };

    const throttledReposition = throttle(handleReposition, 16); // 60fps

    if (modalPosition) {
      window.addEventListener('resize', throttledReposition);
      window.addEventListener('scroll', throttledReposition, { passive: true });
      window.addEventListener('orientationchange', throttledReposition);

      return () => {
        window.removeEventListener('resize', throttledReposition);
        window.removeEventListener('scroll', throttledReposition);
        window.removeEventListener('orientationchange', throttledReposition);
      };
    }
  }, [modalPosition, calculateModalPosition]);

  return {
    modalPosition,
    positionModal,
    resetPosition
  };
};

// Throttle utility function
function throttle<T extends (...args: any[]) => any>(func: T, limit: number): T {
  let inThrottle: boolean;
  return ((...args: any[]) => {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }) as T;
}