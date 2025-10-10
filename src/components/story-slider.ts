/**
 * Story Slider dialog handoff
 *
 * Behavior:
 * - When an inner (non-looping) slider lives inside a dialog and the user
 *   clicks its disabled next/prev buttons at the ends, close the current
 *   dialog and open the dialog inside the next/previous outer slide.
 *
 * Assumptions:
 * - Uses the same data selectors as slider.ts for nav buttons and component root.
 * - Inner sliders are placed inside a <dialog data-dialog-id> element.
 * - Outer story slides are Swiper slides that contain those dialogs.
 * - Dialogs use the Dialog component elsewhere in the codebase; we call
 *   showModal/close directly and dispatch matched custom events for parity.
 */

class StorySlider {
  private readonly COMPONENT_SELECTOR = '[data-slider-el="component"]';
  private readonly NAV_PREV_BUTTON_SELECTOR = '[data-slider-el="nav-prev"]';
  private readonly NAV_NEXT_BUTTON_SELECTOR = '[data-slider-el="nav-next"]';

  constructor() {
    console.info('[StorySlider] init');
    this.bindInnerSliderBoundaryClicks();
  }

  /** Binds click handlers on inner slider nav buttons inside dialogs */
  private bindInnerSliderBoundaryClicks() {
    const innerSliderComponents = document.querySelectorAll<HTMLElement>(
      `dialog[data-dialog-id] ${this.COMPONENT_SELECTOR}`
    );
    console.info(
      `[StorySlider] inner sliders inside dialogs found: ${innerSliderComponents.length}`
    );

    innerSliderComponents.forEach((componentEl, idx) => {
      console.debug('[StorySlider] binding inner slider', { idx, componentEl });
      componentEl.addEventListener('click', (evt) => {
        const target = evt.target as HTMLElement | null;
        if (!target) return;

        // Check for next/prev button clicks via closest() to allow nested icons
        const nextBtn = target.closest(this.NAV_NEXT_BUTTON_SELECTOR) as HTMLElement | null;
        const prevBtn = target.closest(this.NAV_PREV_BUTTON_SELECTOR) as HTMLElement | null;

        // Ensure the found button belongs to this component
        const isWithinThisComponent = (btn: HTMLElement | null) =>
          !!btn && btn.closest(this.COMPONENT_SELECTOR) === componentEl;

        if (isWithinThisComponent(nextBtn)) {
          const disabled = this.isNavDisabled(nextBtn);
          const pos = this.getInnerActivePosition(componentEl);
          const atLast = !!pos && pos.index === pos.count - 1;
          console.log('[StorySlider] next clicked', { idx, disabled, atLast, nextBtn });
          if (atLast) {
            evt.preventDefault();
            evt.stopPropagation();
            this.handoffToAdjacentStory(componentEl, 'next');
          }
          return;
        }

        if (isWithinThisComponent(prevBtn)) {
          const disabled = this.isNavDisabled(prevBtn);
          const pos = this.getInnerActivePosition(componentEl);
          const atFirst = !!pos && pos.index === 0;
          console.log('[StorySlider] prev clicked', { idx, disabled, atFirst, prevBtn });
          if (atFirst) {
            evt.preventDefault();
            evt.stopPropagation();
            this.handoffToAdjacentStory(componentEl, 'prev');
          }
          return;
        }
      });
    });
  }

  /** Determines nav disabled via class or ARIA */
  private isNavDisabled(btn: HTMLElement): boolean {
    return (
      btn.classList.contains('is-disabled') ||
      btn.getAttribute('aria-disabled') === 'true' ||
      btn.hasAttribute('disabled')
    );
  }

  /**
   * Close current dialog and open the dialog inside adjacent (next/prev) outer slide
   */
  private handoffToAdjacentStory(innerComponentEl: HTMLElement, dir: 'next' | 'prev') {
    const currentDialog = innerComponentEl.closest<HTMLDialogElement>('dialog[data-dialog-id]');
    if (!currentDialog) {
      console.warn('[StorySlider] no current dialog found for inner slider');
      return;
    }

    const outerSwiper = currentDialog.closest<HTMLElement>('.swiper');
    const currentOuterSlide = currentDialog.closest<HTMLElement>('.swiper-slide');

    let targetSlide: HTMLElement | null = null;

    if (outerSwiper && currentOuterSlide) {
      const wrapper = outerSwiper.querySelector<HTMLElement>('.swiper-wrapper');
      const slides = wrapper
        ? (Array.from(wrapper.children).filter((el) =>
            (el as HTMLElement).classList?.contains('swiper-slide') &&
            !(el as HTMLElement).classList?.contains('swiper-slide-duplicate')
          ) as HTMLElement[])
        : [];

      let currentIndex = slides.indexOf(currentOuterSlide);
      if (currentIndex === -1) {
        const raw = currentOuterSlide.getAttribute('data-swiper-slide-index');
        const origIdx = raw ? Number.parseInt(raw, 10) : NaN;
        if (!Number.isNaN(origIdx)) currentIndex = origIdx;
      }

      const delta = dir === 'next' ? 1 : -1;
      const targetIndex = currentIndex + delta;
      targetSlide = slides[targetIndex] ?? null;

      console.debug('[StorySlider] seeking target via indexed siblings', {
        dir,
        found: !!targetSlide,
        currentIndex,
        targetIndex,
        slidesCount: slides.length,
      });
    }

    if (!targetSlide) {
      console.warn('[StorySlider] no target outer slide found', { dir });
      return;
    }

    const targetDialog = targetSlide.querySelector<HTMLDialogElement>('dialog[data-dialog-id]');
    if (!targetDialog) {
      console.warn('[StorySlider] target slide has no dialog', { dir, targetSlide });
      return;
    }

    // Close current and open target
    console.log('[StorySlider] handoff', {
      dir,
      fromDialog: currentDialog.getAttribute('data-dialog-id'),
      toDialog: targetDialog.getAttribute('data-dialog-id'),
    });
    this.closeDialog(currentDialog);
    this.openDialog(targetDialog);
  }

  /** Get current active slide index and total for an inner slider component */
  private getInnerActivePosition(componentEl: HTMLElement):
    | { index: number; count: number; activeEl: HTMLElement | null }
    | null {
    const swiperEl = componentEl.querySelector<HTMLElement>('.swiper');
    const wrapper = swiperEl?.querySelector<HTMLElement>('.swiper-wrapper');
    if (!wrapper) return null;
    const slides = Array.from(
      wrapper.querySelectorAll<HTMLElement>('.swiper-slide:not(.swiper-slide-duplicate)')
    );
    const count = slides.length;
    if (count === 0) return { index: 0, count: 0, activeEl: null };

    // Prefer custom class from slider.ts, fallback to Swiper default
    let activeEl = wrapper.querySelector<HTMLElement>('.swiper-slide.is-active');
    if (!activeEl) activeEl = wrapper.querySelector<HTMLElement>('.swiper-slide-active');

    const index = slides.findIndex((s) => s === activeEl);
    return { index: index < 0 ? 0 : index, count, activeEl };
  }

  /** Mirror Dialog component's open behavior and custom event */
  private openDialog(dialogEl: HTMLDialogElement) {
    if (typeof dialogEl.showModal === 'function') {
      dialogEl.showModal();
    } else {
      // Fallback: open attribute for environments without <dialog> support
      dialogEl.setAttribute('open', '');
    }

    const dialogOpenEvent = new CustomEvent('dialogOpen', {
      detail: { dialogId: dialogEl.getAttribute('data-dialog-id') },
    });
    dialogEl.dispatchEvent(dialogOpenEvent);
  }

  /** Mirror Dialog component's close behavior and custom event */
  private closeDialog(dialogEl: HTMLDialogElement) {
    if (typeof dialogEl.close === 'function') {
      dialogEl.close();
    } else {
      dialogEl.removeAttribute('open');
    }

    const dialogCloseEvent = new CustomEvent('dialogClose', {
      detail: { dialogId: dialogEl.getAttribute('data-dialog-id') },
    });
    dialogEl.dispatchEvent(dialogCloseEvent);
  }
}

// Quick confirmation the script file itself loaded
console.info('[StorySlider] script loaded');

// Initialize after Webflow is ready to ensure DOM is stable
window.Webflow = window.Webflow || [];
window.Webflow.push(() => {
  new StorySlider();
});
