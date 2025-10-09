/**
 * General Slider component
 * To create standalone sliders on the page, add swiper script and this component script to the page
 */

class Slider {
  COMPONENT_SELECTOR = '[data-slider-el="component"]';
  NAV_PREV_BUTTON_SELECTOR = '[data-slider-el="nav-prev"]';
  NAV_NEXT_BUTTON_SELECTOR = '[data-slider-el="nav-next"]';
  PAGINATION_SELECTOR = '[data-slider-el="pagination"], .swiper-pagination';

  swiperComponents: NodeListOf<HTMLElement> | [];
  // Keep last created swiper for backward compatibility
  swiper: Swiper | null;
  // Store all created instances to support multiple and nested swipers
  swipers: Swiper[] = [];

  constructor() {
    this.swiperComponents = document.querySelectorAll(this.COMPONENT_SELECTOR);
    this.initSliders();
  }

  initSliders() {
    this.swiperComponents.forEach((swiperComponent) => {
      // Find the swiper element that belongs to this component specifically
      // (and not to any nested child component) to avoid cross-binding nav.
      const swiperEls = Array.from(swiperComponent.querySelectorAll<HTMLElement>('.swiper'));
      const ownedSwiperEls = swiperEls.filter(
        (el) => el.closest(this.COMPONENT_SELECTOR) === swiperComponent
      );

      const targetSwiperEl = ownedSwiperEls[0];
      if (!targetSwiperEl) {
        console.error('`.swiper` element not found', swiperComponent);
        return;
      }

      // Scope navigation buttons to this component only (ignore nested components)
      const navPrevButtonEl =
        Array.from(
          swiperComponent.querySelectorAll<HTMLElement>(this.NAV_PREV_BUTTON_SELECTOR)
        ).find((el) => el.closest(this.COMPONENT_SELECTOR) === swiperComponent) || null;

      const navNextButtonEl =
        Array.from(
          swiperComponent.querySelectorAll<HTMLElement>(this.NAV_NEXT_BUTTON_SELECTOR)
        ).find((el) => el.closest(this.COMPONENT_SELECTOR) === swiperComponent) || null;

      const navigationConfig =
        navPrevButtonEl && navNextButtonEl
          ? {
              nextEl: navNextButtonEl,
              prevEl: navPrevButtonEl,
              disabledClass: 'is-disabled',
            }
          : false;

      // Detect if this swiper is nested inside another swiper container
      const isNested = !!targetSwiperEl.parentElement?.closest('.swiper');

      // Locate optional pagination scoped to this component
      const paginationEl =
        Array.from(swiperComponent.querySelectorAll<HTMLElement>(this.PAGINATION_SELECTOR)).find(
          (el) => el.closest(this.COMPONENT_SELECTOR) === swiperComponent
        ) || null;
      const bulletClass =
        paginationEl?.getAttribute('data-bullet-class') || 'swiper-pagination-bullet';
      const bulletActiveClass =
        paginationEl?.getAttribute('data-bullet-active-class') || 'swiper-pagination-bullet-active';
      const paginationConfig = paginationEl
        ? {
            el: paginationEl,
            clickable: true,
            bulletClass,
            bulletActiveClass,
          }
        : false;

      const instance = new Swiper(targetSwiperEl, {
        loop: true,
        autoplay: {
          delay: 3000,
          disableOnInteraction: false,
        },
        spaceBetween: 24,
        slidesPerView: 'auto',
        centeredSlides: true,
        navigation: navigationConfig,
        pagination: paginationConfig,
        slideActiveClass: 'is-active',
        slidePrevClass: 'is-previous',
        slideNextClass: 'is-next',
        // Enable nested mode so inner swipers don't trigger outer swipes
        nested: isNested,
        // Helpful defaults for nested interactions
        touchStartPreventDefault: false,
        a11y: {
          enabled: true,
        },
        on: {
          // Expose autoplay progress as a CSS variable on the component container
          autoplayTimeLeft: (_s: any, _time: number, progress: number) => {
            swiperComponent.style.setProperty('--progress', String(1 - progress));
          },
        },
      });

      // Track instances
      this.swipers.push(instance);
      this.swiper = instance; // keep last for backward compatibility
    });
  }
}

window.loadScript('https://cdn.jsdelivr.net/npm/swiper@12/swiper-bundle.min.js', {
  name: 'swiper',
});

document.addEventListener('scriptLoaded:swiper', () => {
  new Slider();
});
