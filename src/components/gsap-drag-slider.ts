/**
 * General Slider component
 * To create standalone sliders on the page, add swiper script and this component script to the page
 */
import { gsapHorizontalDraggableLoop } from '$utils/gsap-draggable-loop-slider';

const COMPONENT_SELECTOR = '[data-gsap-slider-el="component"]';

class GSAPDragSlider {
  private readonly SLIDE_SELECTOR = '[data-gsap-slider-el="slide"]';
  private readonly ACTIVE_SLIDE_CLASS = 'is-active';

  private readonly NAV_PREV_BUTTON_SELECTOR = '[data-slider-el="nav-prev"]';
  private readonly NAV_NEXT_BUTTON_SELECTOR = '[data-slider-el="nav-next"]';

  private readonly PAGINATION_SELECTOR = '[data-slider-el="pagination"], .swiper-pagination';
  private readonly PAGINATION_BULLET_CLASS = 'swiper-pagination-bullet';
  private readonly PAGINATION_BULLET_ACTIVE_CLASS = 'is-active';

  private readonly AUTOPLAY_ATTR = 'data-gsap-slider-autoplay';
  private readonly AUTOPLAY_ACTIVE_CLASS = 'is-autoplay-active';
  private readonly AUTOPLAY_PAUSED_CLASS = 'is-autoplay-paused';
  private readonly AUTOPLAY_TIMER_ATTR = 'data-gsap-slider-autoplay-timer-ms';
  private AUTOPLAY_INTERVAL_MS = 6000;

  private componentEl: HTMLElement;
  private slidesList: HTMLElement[];
  private slidesCount: number = 0;
  private slider: any;
  private activeSlide: HTMLElement | null = null;
  private paginationEl: HTMLElement | null = null;
  private paginationDots: HTMLElement[] = [];

  constructor(componentEl: HTMLElement) {
    this.componentEl = componentEl;
    this.slidesList = Array.from(this.componentEl.querySelectorAll(this.SLIDE_SELECTOR));
    this.slidesCount = this.slidesList.length;

    if (!this.slidesCount) {
      console.warn('[GSAPDragSlider] no slides found');
      return;
    }

    this.initSliders();
    this.setupAutoplay();
  }

  initSliders() {
    this.slider = gsapHorizontalDraggableLoop(this.slidesList, {
      paused: true,
      draggable: true,
      center: true,
      onChange: (slide, index) => {
        // when the active slide changes
        this.activeSlide && this.activeSlide.classList.remove(this.ACTIVE_SLIDE_CLASS);
        slide.classList.add(this.ACTIVE_SLIDE_CLASS);
        this.activeSlide = slide;

        // Update pagination dots
        if (this.paginationEl) {
          this.paginationDots.forEach((dot, idx) => {
            if (idx === index) {
              dot.classList.add(this.PAGINATION_BULLET_ACTIVE_CLASS);
              dot.setAttribute('aria-current', 'true');
            } else {
              dot.classList.remove(this.PAGINATION_BULLET_ACTIVE_CLASS);
              dot.removeAttribute('aria-current');
            }
          });
        }
      },
    });

    this.componentEl
      .querySelector(this.NAV_NEXT_BUTTON_SELECTOR)
      ?.addEventListener('click', () => this.slider.next({ duration: 0.4, ease: 'power1.inOut' }));
    this.componentEl
      .querySelector(this.NAV_PREV_BUTTON_SELECTOR)
      ?.addEventListener('click', () =>
        this.slider.previous({ duration: 0.4, ease: 'power1.inOut' })
      );

    this.createPaginationDots();
  }

  createPaginationDots() {
    this.paginationEl = this.componentEl.querySelector(this.PAGINATION_SELECTOR);
    if (!this.paginationEl) {
      return;
    }

    // Clear existing dots
    this.paginationEl.innerHTML = '';

    this.slidesList.forEach((slide, index) => {
      const dot = document.createElement('button');
      dot.className = this.PAGINATION_BULLET_CLASS;
      dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
      dot.addEventListener('click', () => {
        this.slider.goToIndex(index, { duration: 0.4, ease: 'power1.inOut' });
      });
      this.paginationEl?.appendChild(dot);

      this.paginationDots.push(dot);
    });
  }

  /**
   * Only set up autoplay if the attribute is present, and run the autoplay when the component is in view
   */
  setupAutoplay() {
    if (this.componentEl.getAttribute(this.AUTOPLAY_ATTR) !== 'true') {
      return;
    }

    let autoplayInterval: number | null = null;

    const timer = this.componentEl.getAttribute(this.AUTOPLAY_TIMER_ATTR);
    if (timer) {
      const parsedTimer = parseInt(timer, 10);
      if (!isNaN(parsedTimer) && parsedTimer > 0) {
        this.AUTOPLAY_INTERVAL_MS = parsedTimer;
      }
    }

    this.componentEl.style.setProperty('--autoplay-timer-ms', `${this.AUTOPLAY_INTERVAL_MS}ms`);

    const startAutoplay = () => {
      if (autoplayInterval === null) {
        autoplayInterval = window.setInterval(() => {
          this.slider.next({ duration: 0.4, ease: 'power1.inOut' });
        }, this.AUTOPLAY_INTERVAL_MS);
      }
    };

    const stopAutoplay = () => {
      if (autoplayInterval !== null) {
        clearInterval(autoplayInterval);
        autoplayInterval = null;
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            startAutoplay();
            this.componentEl.classList.add(this.AUTOPLAY_ACTIVE_CLASS);
            this.componentEl.classList.remove(this.AUTOPLAY_PAUSED_CLASS);
          } else {
            stopAutoplay();
            this.componentEl.classList.remove(this.AUTOPLAY_ACTIVE_CLASS);
            this.componentEl.classList.add(this.AUTOPLAY_PAUSED_CLASS);
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(this.componentEl);
  }
}

document.addEventListener('scriptLoaded', () => {
  document.querySelectorAll(COMPONENT_SELECTOR).forEach((componentEl) => {
    new GSAPDragSlider(componentEl);
  });
});
