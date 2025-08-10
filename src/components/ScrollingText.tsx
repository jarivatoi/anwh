import React, { useRef, useEffect, useState } from 'react';
import { ScrollingTextAnimator } from '../utils/scrollingTextAnimator';

interface ScrollingTextProps {
  text?: string;
  className?: string;
  children?: React.ReactNode;
  pauseDuration?: number;
  scrollDuration?: number;
  easing?: string;
}

export const ScrollingText: React.FC<ScrollingTextProps> = ({ 
  text, 
  className = '', 
  children,
  pauseDuration = 2,
  scrollDuration = 4,
  easing = 'power2.inOut'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [needsScrolling, setNeedsScrolling] = useState(false);
  const animatorRef = useRef<ScrollingTextAnimator | null>(null);

  useEffect(() => {
    const checkAndAnimate = () => {
      if (!containerRef.current || !textRef.current) return;

      const container = containerRef.current;
      const textElement = textRef.current;
      
      // Stop any existing animation
      if (animatorRef.current) {
        animatorRef.current.stop();
        animatorRef.current = null;
      }
      
      // Force layout recalculation
      container.offsetWidth;
      textElement.offsetWidth;
      
      // Check if text overflows container
      const containerWidth = container.offsetWidth;
      const textWidth = textElement.scrollWidth;
      
      const currentText = text || 'children content';
      const hasSpaces = currentText.includes(' ');
      const isLongText = currentText.length > 30;
      
      if (textWidth > containerWidth) {
        setNeedsScrolling(true);
        
        // Use enhanced timing for longer text with spaces
        const enhancedPauseDuration = (hasSpaces && isLongText) ? pauseDuration + 1 : pauseDuration;
        const enhancedScrollDuration = (hasSpaces && isLongText) ? scrollDuration + 1 : scrollDuration;
        const enhancedEasing = (hasSpaces && isLongText) ? 'power1.inOut' : easing;
        
        // Create animator with TweenMax-style enhanced timing
        animatorRef.current = ScrollingTextAnimator.create({
          container,
          textElement,
          text: currentText,
          pauseDuration: enhancedPauseDuration,
          scrollDuration: enhancedScrollDuration,
          easing: enhancedEasing
        });
        
        console.log('🎬 Started enhanced TweenMax animation for text:', currentText);
      } else {
        setNeedsScrolling(false);
        console.log('✅ Text fits in container, no animation needed');
      }
    };

    // Initial check
    checkAndAnimate();
    
    // Recheck on window resize
    const handleResize = () => {
      setTimeout(checkAndAnimate, 100);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Recheck when content changes
    const observer = new MutationObserver(() => {
      setTimeout(checkAndAnimate, 50);
    });
    
    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      
      if (animatorRef.current) {
        animatorRef.current.stop();
        animatorRef.current = null;
      }
    };
  }, [text, children, pauseDuration, scrollDuration, easing]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animatorRef.current) {
        animatorRef.current.stop();
        animatorRef.current = null;
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`w-full ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden' // Contain text within parent boundaries
      }
      }
    >
      <div 
        ref={textRef}
        className="whitespace-nowrap"
        style={{
          display: 'inline-block',
          minWidth: '100%',
          maxWidth: 'none',
          overflow: 'hidden' // Prevent text from escaping container
        }
        }
      >
        {children || text}
      </div>
    </div>
  );
};