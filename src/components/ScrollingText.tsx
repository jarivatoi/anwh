import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';

interface ScrollingTextProps {
  text?: string;
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export const ScrollingText: React.FC<ScrollingTextProps> = ({ 
  text, 
  className = '', 
  children,
  style = {}
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [needsScrolling, setNeedsScrolling] = useState(false);
  const animationRef = useRef<gsap.core.Timeline | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Global scroll detection to pause/resume all scrolling text
  useEffect(() => {
    const handleScroll = () => {
      // Pause animation immediately without resetting position
      if (animationRef.current && !isPaused) {
        animationRef.current.pause();
        setIsPaused(true);
      }
      
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Resume animation after scroll stops (300ms delay)
      scrollTimeoutRef.current = setTimeout(() => {
        if (animationRef.current && isPaused) {
          animationRef.current.resume();
          setIsPaused(false);
        }
      }, 500); // Increased delay to ensure scroll has completely stopped
    };

    // Listen to scroll events on window and all scrollable containers
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });
    
    // Also listen for touch events that might cause scrolling
    document.addEventListener('touchmove', handleScroll, { passive: true });
    document.addEventListener('touchend', () => {
      // Add extra delay after touch end to ensure scrolling has stopped
      setTimeout(handleScroll, 100);
    }, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
      document.removeEventListener('touchmove', handleScroll);
      document.removeEventListener('touchend', handleScroll);
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [isPaused]);

  useEffect(() => {
    const checkAndAnimate = () => {
      if (!containerRef.current || !textRef.current) return;

      const container = containerRef.current;
      const textElement = textRef.current;
      
      // Reset any existing animation
      if (animationRef.current) {
        animationRef.current.kill();
        animationRef.current = null;
      }
      
      // Reset text position
      gsap.set(textElement, { x: 0 });
      
      // Force layout recalculation
      container.offsetWidth;
      textElement.offsetWidth;
      
      // Check if text overflows container
      const containerWidth = container.offsetWidth;
      const textWidth = textElement.scrollWidth;
      
      console.log('📏 ScrollingText dimensions:', {
        containerWidth,
        textWidth,
        needsScrolling: textWidth > containerWidth,
        text: text || 'children content'
      });
      
      if (textWidth > containerWidth) {
        setNeedsScrolling(true);
        
        // Calculate scroll distance (how much text extends beyond container)
        const scrollDistance = textWidth - containerWidth + 2; // Add 2px end padding
        
        // Create GSAP timeline with your specified timing
        const timeline = gsap.timeline({ 
          repeat: -1, // Infinite loop
          ease: "power2.inOut"
        });
        
        // 1s pause at start
        timeline.to(textElement, {
          duration: 1,
          x: 0
        });
        
        // 2.5s scroll to end
        timeline.to(textElement, {
          duration: 2.5,
          x: -scrollDistance,
          ease: "power2.inOut"
        });
        
        // 1s pause at end
        timeline.to(textElement, {
          duration: 1,
          x: -scrollDistance
        });
        
        // 2.5s scroll back to start
        timeline.to(textElement, {
          duration: 2.5,
          x: 0,
          ease: "power2.inOut"
        });
        
        animationRef.current = timeline;
        
        // If currently paused due to scrolling, start the animation paused
        if (isPaused) {
          timeline.pause();
        }
        
        console.log('🎬 Started scrolling animation for text:', text || 'children');
      } else {
        setNeedsScrolling(false);
        console.log('✅ Text fits in container, no scrolling needed');
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
      
      if (animationRef.current) {
        animationRef.current.kill();
        animationRef.current = null;
      }
    };
  }, [text, children, isPaused]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        animationRef.current.kill();
        animationRef.current = null;
      }
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
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
        overflow: 'hidden', // Contain text within parent boundaries
        ...style
      }}
    >
      <div 
        ref={textRef}
        className="whitespace-nowrap"
        style={{
          display: 'inline-block',
          minWidth: '100%',
          maxWidth: 'none',
          overflow: 'hidden' // Prevent text from escaping container
        }}
      >
        {children || text}
      </div>
    </div>
  );
};