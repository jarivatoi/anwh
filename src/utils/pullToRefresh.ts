/**
 * Pull-to-refresh utility for PWA
 * Provides native-like pull-to-refresh functionality when app is installed as PWA
 */

interface PullToRefreshOptions {
  threshold?: number;
  maxDistance?: number;
  onRefresh?: () => void;
  disabled?: boolean;
}

export class PullToRefreshManager {
  private options: Required<PullToRefreshOptions>;
  private startY = 0;
  private currentY = 0;
  private isPulling = false;
  private isRefreshing = false;
  private pullIndicator: HTMLElement | null = null;
  
  constructor(options: PullToRefreshOptions = {}) {
    this.options = {
      threshold: 80,
      maxDistance: 120,
      onRefresh: () => window.location.reload(),
      disabled: false,
      ...options
    };
    
    this.init();
  }
  
  private init() {
    // Only enable in PWA mode
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                 (window.navigator as any).standalone === true;
    
    if (!isPWA || this.options.disabled) {
      console.log('📱 Pull-to-refresh: Not in PWA mode or disabled');
      return;
    }
    
    console.log('📱 Pull-to-refresh: Initializing for PWA');
    
    // Create pull indicator
    this.createPullIndicator();
    
    // Add event listeners
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
  }
  
  private createPullIndicator() {
    this.pullIndicator = document.createElement('div');
    this.pullIndicator.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 0px;
      background: linear-gradient(180deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%);
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 10px;
      z-index: 999999;
      transition: height 0.2s ease-out;
      overflow: hidden;
    `;
    
    this.pullIndicator.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        opacity: 0;
        transform: scale(0.8);
        transition: opacity 0.2s ease-out, transform 0.2s ease-out;
      " class="pull-content">
        <div style="
          width: 20px;
          height: 20px;
          border: 2px solid #10b981;
          border-top: 2px solid transparent;
          border-radius: 50%;
        " class="pull-spinner"></div>
        <span style="
          color: #10b981;
          fontSize: 14px;
          fontWeight: 600;
          fontFamily: -apple-system, BlinkMacSystemFont, sans-serif;
        " class="pull-text">Pull to refresh</span>
      </div>
    `;
    
    document.body.appendChild(this.pullIndicator);
  }
  
  private handleTouchStart(e: TouchEvent) {
    // Only trigger if we're at the top of the page
    const isAtTop = window.scrollY === 0;
    if (!isAtTop || this.isRefreshing) return;
    
    this.startY = e.touches[0].clientY;
    this.isPulling = false;
  }
  
  private handleTouchMove(e: TouchEvent) {
    if (this.isRefreshing) return;
    
    const isAtTop = window.scrollY === 0;
    if (!isAtTop) return;
    
    this.currentY = e.touches[0].clientY;
    const pullDistance = Math.max(0, this.currentY - this.startY);
    
    if (pullDistance > 10) {
      this.isPulling = true;
      
      // Prevent default scroll behavior when pulling
      e.preventDefault();
      
      // Update pull indicator
      this.updatePullIndicator(pullDistance);
    }
  }
  
  private handleTouchEnd() {
    if (!this.isPulling || this.isRefreshing) return;
    
    const pullDistance = Math.max(0, this.currentY - this.startY);
    
    if (pullDistance > this.options.threshold) {
      // Trigger refresh
      this.triggerRefresh();
    } else {
      // Reset if not enough pull distance
      this.resetPullIndicator();
    }
    
    this.isPulling = false;
  }
  
  private updatePullIndicator(pullDistance: number) {
    if (!this.pullIndicator) return;
    
    const clampedDistance = Math.min(pullDistance, this.options.maxDistance);
    const progress = clampedDistance / this.options.threshold;
    
    // Update indicator height and content
    this.pullIndicator.style.height = `${clampedDistance}px`;
    
    const content = this.pullIndicator.querySelector('.pull-content') as HTMLElement;
    const spinner = this.pullIndicator.querySelector('.pull-spinner') as HTMLElement;
    const text = this.pullIndicator.querySelector('.pull-text') as HTMLElement;
    
    if (content) {
      content.style.opacity = Math.min(progress, 1).toString();
      content.style.transform = `scale(${Math.min(progress, 1)})`;
    }
    
    if (text) {
      text.textContent = pullDistance > this.options.threshold ? 'Release to refresh' : 'Pull to refresh';
    }
    
    if (spinner && pullDistance > this.options.threshold) {
      spinner.style.animation = 'spin 1s linear infinite';
    } else if (spinner) {
      spinner.style.animation = 'none';
    }
  }
  
  private triggerRefresh() {
    if (!this.pullIndicator) return;
    
    this.isRefreshing = true;
    
    // Show refreshing state
    this.pullIndicator.style.height = '60px';
    const content = this.pullIndicator.querySelector('.pull-content') as HTMLElement;
    const spinner = this.pullIndicator.querySelector('.pull-spinner') as HTMLElement;
    const text = this.pullIndicator.querySelector('.pull-text') as HTMLElement;
    
    if (content) {
      content.style.opacity = '1';
      content.style.transform = 'scale(1)';
    }
    
    if (spinner) {
      spinner.style.animation = 'spin 1s linear infinite';
    }
    
    if (text) {
      text.textContent = 'Refreshing...';
    }
    
    // Trigger refresh after short delay
    setTimeout(() => {
      this.options.onRefresh();
    }, 300);
  }
  
  private resetPullIndicator() {
    if (!this.pullIndicator) return;
    
    this.pullIndicator.style.height = '0px';
    const content = this.pullIndicator.querySelector('.pull-content') as HTMLElement;
    const spinner = this.pullIndicator.querySelector('.pull-spinner') as HTMLElement;
    
    if (content) {
      content.style.opacity = '0';
      content.style.transform = 'scale(0.8)';
    }
    
    if (spinner) {
      spinner.style.animation = 'none';
    }
  }
  
  public destroy() {
    document.removeEventListener('touchstart', this.handleTouchStart);
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
    
    if (this.pullIndicator && document.body.contains(this.pullIndicator)) {
      document.body.removeChild(this.pullIndicator);
    }
  }
}

// Add CSS for spinner animation
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

// Auto-initialize for PWA
let pullToRefreshInstance: PullToRefreshManager | null = null;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    pullToRefreshInstance = new PullToRefreshManager();
  });
} else {
  pullToRefreshInstance = new PullToRefreshManager();
}

// Export for manual control if needed
export { PullToRefreshManager };