import { useCallback, useRef } from 'react';

interface LongPressOptions {
  onLongPress: () => void;
  onPress?: () => void;
  delay?: number;
}

interface LongPressHandlers {
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onTouchCancel: () => void;
}

/**
 * Custom hook for handling long-press interactions
 * @param options - Configuration options for long-press behavior
 * @returns Event handlers for mouse and touch events
 */
export const useLongPress = ({
  onLongPress,
  onPress,
  delay = 500
}: LongPressOptions): LongPressHandlers => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const isMouseDownRef = useRef(false);
  const isTouchStartRef = useRef(false);

  const startLongPress = useCallback(() => {
    isLongPressRef.current = false;
    
    timeoutRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      console.log('🔥 Long press triggered!');
      onLongPress();
    }, delay);
  }, [onLongPress, delay]);

  const cancelLongPress = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    isMouseDownRef.current = false;
    isTouchStartRef.current = false;
  }, []);

  const handlePress = useCallback(() => {
    if (!isLongPressRef.current && onPress) {
      console.log('👆 Short press triggered!');
      onPress();
    }
    isLongPressRef.current = false;
    isMouseDownRef.current = false;
    isTouchStartRef.current = false;
  }, [onPress]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (isTouchStartRef.current) return; // Prevent duplicate if touch already started
    console.log('🖱️ Mouse down - starting long press timer');
    isMouseDownRef.current = true;
    startLongPress();
  }, [startLongPress]);

  const onMouseUp = useCallback(() => {
    if (!isMouseDownRef.current) return;
    console.log('🖱️ Mouse up');
    cancelLongPress();
    handlePress();
  }, [cancelLongPress, handlePress]);

  const onMouseLeave = useCallback(() => {
    if (!isMouseDownRef.current) return;
    console.log('🖱️ Mouse leave - canceling');
    cancelLongPress();
  }, [cancelLongPress]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (isMouseDownRef.current) return; // Prevent duplicate if mouse already started
    console.log('📱 Touch start - starting long press timer');
    isTouchStartRef.current = true;
    startLongPress();
  }, [startLongPress]);

  const onTouchEnd = useCallback(() => {
    if (!isTouchStartRef.current) return;
    console.log('📱 Touch end');
    cancelLongPress();
    handlePress();
  }, [cancelLongPress, handlePress]);

  const onTouchCancel = useCallback(() => {
    if (!isTouchStartRef.current) return;
    console.log('📱 Touch cancel');
    cancelLongPress();
  }, [cancelLongPress]);

  return {
    onMouseDown,
    onMouseUp,
    onMouseLeave,
    onTouchStart,
    onTouchEnd,
    onTouchCancel
  };
};