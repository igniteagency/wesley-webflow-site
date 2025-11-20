/**
 * General Slider component
 * To create standalone sliders on the page, add swiper script and this component script to the page
 */

class SwiperSlider {
  COMPONENT_SELECTOR = '[data-slider-el="component"]';
  NAV_PREV_BUTTON_SELECTOR = '[data-slider-el="nav-prev"]';
  NAV_NEXT_BUTTON_SELECTOR = '[data-slider-el="nav-next"]';
  PAGINATION_SELECTOR = '[data-slider-el="pagination"], .swiper-pagination';

  CUSTOM_EFFECT_ATTR = 'data-slider-effect';
  CUSTOM_GAP_ATTR = 'data-slider-gap';

  swiperComponents: NodeListOf<HTMLElement> | [];
  swiper: Swiper | null;

  constructor() {
    this.swiperComponents = document.querySelectorAll(this.COMPONENT_SELECTOR);
    this.initSliders();
  }

  initSliders() {
    this.swiperComponents.forEach(async (swiperComponent) => {
      const swiperEl = swiperComponent.querySelector('.swiper');
      if (!swiperEl) {
        console.error('`.swiper` element not found', swiperComponent);
        return;
      }

      // Navigation buttons scoped to this component
      const navPrevButtonEl = (Array.from(
        swiperComponent.querySelectorAll(this.NAV_PREV_BUTTON_SELECTOR)
      ).find((el) => el.closest(this.COMPONENT_SELECTOR) === swiperComponent) ||
        null) as HTMLElement | null;

      const navNextButtonEl = (Array.from(
        swiperComponent.querySelectorAll(this.NAV_NEXT_BUTTON_SELECTOR)
      ).find((el) => el.closest(this.COMPONENT_SELECTOR) === swiperComponent) ||
        null) as HTMLElement | null;

      const navigationConfig =
        navPrevButtonEl && navNextButtonEl
          ? {
              nextEl: navNextButtonEl,
              prevEl: navPrevButtonEl,
              disabledClass: 'is-disabled',
            }
          : false;

      // Optional pagination support (scoped)
      const paginationEl = (Array.from(
        swiperComponent.querySelectorAll(this.PAGINATION_SELECTOR)
      ).find((el) => el.closest(this.COMPONENT_SELECTOR) === swiperComponent) ||
        null) as HTMLElement | null;
      const bulletClass =
        paginationEl?.getAttribute('data-bullet-class') || 'slider_pagination-bullet';
      const bulletActiveClass =
        paginationEl?.getAttribute('data-bullet-active-class') || 'is-active';
      const paginationConfig = paginationEl
        ? {
            el: paginationEl,
            clickable: true,
            bulletClass,
            bulletActiveClass,
          }
        : false;

      let effect = 'slide';
      const effectAttr = swiperComponent.getAttribute(this.CUSTOM_EFFECT_ATTR);
      if (effectAttr !== null && effectAttr !== undefined) {
        effect = effectAttr.trim().toLowerCase();
      }

      if (effectAttr === 'left-stack') {
        effect = 'creative';
      }

      // Mark nested sliders so Swiper handles events properly
      const nested = !!swiperEl.parentElement?.closest('.swiper');

      // Per-instance spacing from wrapper attribute
      const wrapperEl = swiperEl.querySelector('.swiper-wrapper') as HTMLElement | null;
      const spaceBetweenAttr = wrapperEl?.getAttribute('data-space-between');
      const parsedSpaceBetween =
        spaceBetweenAttr !== null && spaceBetweenAttr !== undefined
          ? Number.parseInt(spaceBetweenAttr, 10)
          : NaN;
      const spaceBetween = Number.isNaN(parsedSpaceBetween) ? 32 : parsedSpaceBetween;

      // Per-instance slidesPerView from wrapper attribute
      const slidesPerViewAttr = wrapperEl?.getAttribute('data-slides-per-view');
      const slidesPerView =
        slidesPerViewAttr && slidesPerViewAttr.trim().toLowerCase() !== 'auto'
          ? (Number.parseFloat(slidesPerViewAttr) as number | 'auto')
          : ('auto' as const);

      // Per-instance centeredSlides from wrapper attribute (default true)
      const centeredSlidesAttr = wrapperEl?.getAttribute('data-centered-slides');
      let centeredSlides = true;
      if (centeredSlidesAttr !== null && centeredSlidesAttr !== undefined) {
        const val = centeredSlidesAttr.trim().toLowerCase();
        if (val === 'false' || val === '0' || val === 'no' || val === 'off') {
          centeredSlides = false;
        } else if (val === 'true' || val === '1' || val === 'yes' || val === 'on' || val === '') {
          centeredSlides = true;
        }
      }

      // Per-instance loop from wrapper attribute (default true)
      const loopAttr = wrapperEl?.getAttribute('data-loop');
      let loop = true;
      if (loopAttr !== null && loopAttr !== undefined) {
        const val = loopAttr.trim().toLowerCase();
        if (val === 'false' || val === '0' || val === 'no' || val === 'off') {
          loop = false;
        } else if (val === 'true' || val === '1' || val === 'yes' || val === 'on' || val === '') {
          loop = true;
        }
      }

      // Per-instance gap from wrapper attribute (default 32)
      const gapAttr = wrapperEl?.getAttribute(this.CUSTOM_GAP_ATTR);
      const gap = gapAttr !== null && gapAttr !== undefined ? Number.parseFloat(gapAttr) : 32;

      const instance = new Swiper(swiperEl, {
        loop,
        spaceBetween: gap,
        slidesPerView: Number.isNaN(slidesPerView as number)
          ? 'auto'
          : (slidesPerView as number | 'auto'),
        speed: 1000,
        effect,
        coverflowEffect: {
          rotate: 25,
          stretch: 0,
          depth: 100,
          modifier: 1,
          slideShadows: true,
        },
        creativeEffect: {
          limitProgress: 2,
          prev: {
            translate: ['-10%', 0, 0],
            scale: 0.9,
            origin: 'center center',
            opacity: 0.8,
          },
          next: {
            translate: ['100%', 0, 0],
          },
        },
        centeredSlides,
        watchSlidesProgress: true,
        autoplay: {
          delay: 10000,
          disableOnInteraction: false,
        },
        navigation: navigationConfig,
        pagination: paginationConfig,
        slideActiveClass: 'is-active',
        slidePrevClass: 'is-previous',
        slideNextClass: 'is-next',
        // nested,
        // Prevent passive event warnings on nested content
        touchStartPreventDefault: false,
        a11y: {
          enabled: true,
        },
        // Optional progress CSS var update (no-op if not used)
        on: {
          autoplayTimeLeft: (_swiper: any, _time: number, progress: number) => {
            requestAnimationFrame(() => {
              swiperComponent.style.setProperty('--progress', String(1 - progress));
            });
          },
        },
        breakpoints: {
          320: {
            spaceBetween: gap / 2,
          },
          600: {
            spaceBetween: gap / 1.5,
          },
          992: {
            spaceBetween: gap,
          },
        },
      });

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!instance.autoplay) return;
            if (entry.isIntersecting) {
              instance.autoplay.start();
            } else {
              instance.autoplay.stop();
            }
          });
        },
        { threshold: 0.2 }
      );
      observer.observe(swiperComponent);
    });
  }
}

window.loadCSS('https://cdn.jsdelivr.net/npm/swiper@12/swiper-bundle.min.css');

window.loadScript('https://cdn.jsdelivr.net/npm/swiper@12/swiper-bundle.min.js', {
  name: 'swiper',
});

document.addEventListener('scriptLoaded:swiper', () => {
  new SwiperSlider();
});
