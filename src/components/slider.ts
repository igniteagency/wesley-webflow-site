/**
 * General Slider component
 * To create standalone sliders on the page, add swiper script and this component script to the page
 */

class Slider {
  COMPONENT_SELECTOR = '[data-slider-el="component"]';
  NAV_PREV_BUTTON_SELECTOR = '[data-slider-el="nav-prev"]';
  NAV_NEXT_BUTTON_SELECTOR = '[data-slider-el="nav-next"]';

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

      const instance = new Swiper(targetSwiperEl, {
        loop: true,
        autoplay: {
          delay: 3000,
        },
        spaceBetween: 24,
        slidesPerView: 'auto',
        centeredSlides: true,
        navigation: navigationConfig,
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
