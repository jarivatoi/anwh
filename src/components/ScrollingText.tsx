import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';

interface ScrollingTextProps {
  text?: string;
  className?: string;
  children?: React.ReactNode;
}

export const ScrollingText: React.FC<ScrollingTextProps> = ({ 
  text, 
  className = '', 
  children 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [needsScrolling, setNeedsScrolling] = useState(false);
  const animationRef = useRef<gsap.core.Timeline | null>(null);

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
      
      // Force layout recalculation and wait for next frame
      requestAnimationFrame(() => {
        const containerWidth = container.getBoundingClientRect().width;
        const textWidth = textElement.getBoundingClientRect().width;
        
        console.log('📏 ScrollingText dimensions:', {
          containerWidth,
          textWidth,
          needsScrolling: textWidth > containerWidth + 5, // Add 5px tolerance
          text: text || 'children content',
          containerElement: container,
          textElement: textElement
        });
        
        if (textWidth > containerWidth + 5) { // Add 5px tolerance to prevent unnecessary scrolling
          setNeedsScrolling(true);
          
          // Calculate scroll distance (how much text extends beyond container)
          const scrollDistance = textWidth - containerWidth + 10; // Add 10px end padding
          
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
          
          console.log('🎬 Started scrolling animation for text:', text || 'children');
        } else {
          setNeedsScrolling(false);
          console.log('✅ Text fits in container, no scrolling needed');
        }
      });
    };
 
    // Initial check with delay to ensure DOM is ready
    const timeoutId = setTimeout(checkAndAnimate, 100);
      
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
      clearTimeout(timeoutId);
      
      if (animationRef.current) {
        animationRef.current.kill();
        animationRef.current = null;
      }
    };
  }, [text, children]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        animationRef.current.kill();
        animationRef.current = null;
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`overflow-hidden w-full ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '100%',
        textAlign: 'left' // Force left alignment for proper overflow detection
      }}
    >
      <div 
        ref={textRef}
        className="whitespace-nowrap"
        style={{
          display: 'inline-block',
          textAlign: 'left', // Ensure text starts from the left
          width: 'auto',
          maxWidth: 'none'
        }}
      >
        {children || text}
      </div>
    </div>
  );
};