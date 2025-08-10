import { gsap } from 'gsap';

export interface ScrollingTextOptions {
  container: HTMLElement;
  textElement: HTMLElement;
  text: string;
  pauseDuration?: number;
  scrollDuration?: number;
  easing?: string;
}

export class ScrollingTextAnimator {
  private timeline: gsap.core.Timeline | null = null;
  private options: Required<ScrollingTextOptions>;

  constructor(options: ScrollingTextOptions) {
    this.options = {
      pauseDuration: 2,
      scrollDuration: 4,
      easing: 'power2.inOut',
      ...options
    };
  }

  start(): void {
    this.stop(); // Clear any existing animation
    
    const { container, textElement, pauseDuration, scrollDuration, easing } = this.options;
    
    // Reset position
    gsap.set(textElement, { x: 0 });
    
    // Force layout recalculation
    container.offsetWidth;
    textElement.offsetWidth;
    
    const containerWidth = container.offsetWidth;
    const textWidth = textElement.scrollWidth;
    
    console.log('📏 ScrollingTextAnimator dimensions:', {
      containerWidth,
      textWidth,
      needsScrolling: textWidth > containerWidth
    });
    
    if (textWidth <= containerWidth) {
      console.log('✅ Text fits in container, no animation needed');
      return;
    }
    
    // Calculate scroll distance with padding
    const scrollDistance = textWidth - containerWidth + 20; // Extra padding for readability
    
    // Create TweenMax timeline for longer text with spaces
    this.timeline = gsap.timeline({ 
      repeat: -1,
      ease: easing
    });
    
    // Enhanced animation sequence for better readability
    this.timeline
      // Initial pause at start (longer for reading)
      .to(textElement, {
        duration: pauseDuration,
        x: 0,
        ease: 'none'
      })
      // Smooth scroll to end (slower for longer text)
      .to(textElement, {
        duration: scrollDuration,
        x: -scrollDistance,
        ease: easing
      })
      // Pause at end (longer for reading end of text)
      .to(textElement, {
        duration: pauseDuration,
        x: -scrollDistance,
        ease: 'none'
      })
      // Smooth scroll back to start
      .to(textElement, {
        duration: scrollDuration,
        x: 0,
        ease: easing
      });
    
    console.log('🎬 TweenMax animation started with enhanced timing for longer text');
  }

  stop(): void {
    if (this.timeline) {
      this.timeline.kill();
      this.timeline = null;
    }
  }

  updateText(newText: string): void {
    this.options.text = newText;
    this.start(); // Restart animation with new text
  }

  // Static method for quick setup
  static create(options: ScrollingTextOptions): ScrollingTextAnimator {
    const animator = new ScrollingTextAnimator(options);
    animator.start();
    return animator;
  }
}