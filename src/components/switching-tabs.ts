/**
 * Self-invoking file. Add it directly to the page that has tabs
 * E.g: window.loadScript('components/switching-tabs.js');
 */

export class AutoRotatingTabs {
  private component: HTMLElement;
  private tabs: HTMLDetailsElement[];
  private currentTabIndex: number = 0;
  private intervalId: number | null = null;
  private autoplayTimer: number;
  private intersectionObserver: IntersectionObserver;
  private isInView: boolean = false;
  private mediaQuery: MediaQueryList;
  private abortController: AbortController;

  private readonly AUTOPLAY_TIMER_CSS_VAR = '--autoplay-timer';
  private readonly OUT_OF_VIEW_CLASS = 'is-out-of-view';
  private readonly TAB_CLOSING_CLASS = 'is-closing';

  constructor(component: HTMLElement) {
    this.abortController = new AbortController();
    this.component = component;
    this.mediaQuery = window.matchMedia('(min-width: 992px)');
    this.tabs = Array.from(component.querySelectorAll<HTMLDetailsElement>('details'));

    const timerValue = getComputedStyle(component)
      .getPropertyValue(this.AUTOPLAY_TIMER_CSS_VAR)
      .trim();

    if (timerValue.endsWith('ms')) {
      this.autoplayTimer = parseFloat(timerValue);
    } else {
      // Assume seconds (e.g., "6s" or just "6")
      this.autoplayTimer = parseFloat(timerValue) * 1000;
    }

    if (!this.autoplayTimer) {
      this.autoplayTimer = 6000;
    }

    if (!component || this.tabs.length === 0) {
      console.warn('AutoRotatingTabs: No valid component or tabs found.');
      return;
    }

    this.init();
  }

  private init(): void {
    this.setupEventListeners();
    this.openTabAtCurrentIndex();

    // Initial check
    if (this.mediaQuery.matches) {
      this.setupIntersectionObserver();
    }

    // Listen for changes
    this.mediaQuery.addEventListener(
      'change',
      (e) => {
        if (e.matches) {
          this.setupIntersectionObserver();
        } else {
          this.pauseAutoRotation();
          if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
          }
        }
      },
      { signal: this.abortController.signal }
    );
  }

  private setupEventListeners(): void {
    this.tabs.forEach((tab, index) => {
      const toggle = tab.querySelector('summary') as HTMLElement;
      toggle.addEventListener(
        'click',
        (event) => {
          event.preventDefault();

          if (index === this.currentTabIndex || tab.open) {
            return;
          }

          this.currentTabIndex = index;
          this.openTabAtCurrentIndex();
        },
        { signal: this.abortController.signal }
      );
    });
  }

  private setupIntersectionObserver(): void {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target === this.component) {
            this.isInView = entry.isIntersecting;

            if (this.isInView) {
              this.startAutoRotation();
            } else {
              this.pauseAutoRotation();
            }
          }
        });
      },
      {
        threshold: 0.1, // Trigger when 10% of component is visible
      }
    );

    this.intersectionObserver.observe(this.component);
  }

  private openTabAtCurrentIndex(): void {
    const el = this.tabs[this.currentTabIndex];
    const content = el.querySelector('summary + div') as HTMLElement;
    const wasOpen = el.open;
    el.open = true;
    this.startAutoRotation();
    this.closeOtherTabs();

    const height = content.scrollHeight;

    if (!wasOpen) {
      gsap.set(content, { height: 0 });
    }
    gsap.to(content, {
      height,
      duration: 0.3,
      overwrite: true,
      onComplete: () => {
        gsap.set(content, { height: 'auto' });
      },
    });
  }

  private closeOtherTabs() {
    this.tabs.forEach((tab, index) => {
      if (index !== this.currentTabIndex && tab.open) {
        tab.classList.add(this.TAB_CLOSING_CLASS);
        const content = tab.querySelector('summary + div') as HTMLElement;

        if (!content.style.height || content.style.height === 'auto') {
          gsap.set(content, { height: content.scrollHeight });
        }

        gsap.to(content, {
          height: 0,
          duration: 0.3,
          overwrite: true,
          onComplete: () => {
            tab.open = false;
            tab.classList.remove(this.TAB_CLOSING_CLASS);
            gsap.set(content, { clearProps: 'height' });
          },
        });
      }
    });
  }

  private startAutoRotation(): void {
    if (!this.mediaQuery.matches) return;
    if (!this.isInView) return;

    this.pauseAutoRotation();
    this.component.classList.remove(this.OUT_OF_VIEW_CLASS);

    this.intervalId = window.setInterval(() => {
      this.rotateToNext();
    }, this.autoplayTimer);
  }

  private pauseAutoRotation(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.component.classList.add(this.OUT_OF_VIEW_CLASS);
  }

  private rotateToNext(): void {
    this.currentTabIndex = (this.currentTabIndex + 1) % this.tabs.length;
    this.openTabAtCurrentIndex();
  }

  public destroy(): void {
    this.abortController.abort();

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  }
}

// Initialize all auto-rotating tabs components on the page
export function initAutoRotatingTabs(): void {
  const tabsComponents = document.querySelectorAll('[data-el="switching-tabs-component"]');

  tabsComponents.forEach((component) => {
    new AutoRotatingTabs(component as HTMLElement);
  });
}

window.Webflow = window.Webflow || [];
window.Webflow?.push(() => {
  initAutoRotatingTabs();
});
