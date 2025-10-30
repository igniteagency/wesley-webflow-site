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
// TODO: refactor to remove usage of Swiper.js from inside the <dialog> element. Shall be easier with custom JS
import { gsapHorizontalDraggableLoop } from '$utils/gsap-draggable-loop-slider';

const SECTION_SELECTOR = '.section_stories';
const sectionList = document.querySelectorAll(SECTION_SELECTOR);

class StorySlider {
  private readonly COMPONENT_SELECTOR = '[data-slider-el="component"]';
  private readonly NAV_PREV_BUTTON_SELECTOR = '[data-slider-el="nav-prev"]';
  private readonly NAV_NEXT_BUTTON_SELECTOR = '[data-slider-el="nav-next"]';

  private readonly STORIES_ITEM_SELECTOR = '.stories_item';

  private readonly ACTIVE_SLIDE_CLASS = 'is-active';

  private sectionEl: HTMLElement;
  private storyItemsList: HTMLElement[];
  private storyItemCount: number = 0;

  constructor(sectionEl: HTMLElement) {
    console.info('[StorySlider] init');
    this.sectionEl = sectionEl;
    this.storyItemsList = Array.from(this.sectionEl.querySelectorAll(this.STORIES_ITEM_SELECTOR));
    this.storyItemCount = this.storyItemsList.length;

    if (!this.storyItemCount) {
      console.warn('[StorySlider] no story items found');
      return;
    }

    this.initDraggableMainSlider();
    this.bindInnerSliderBoundaryClicks();
  }

  private initDraggableMainSlider() {
    let activeSlide: HTMLElement | null;
    const loop = gsapHorizontalDraggableLoop(this.storyItemsList, {
      paused: true,
      draggable: true,
      center: true,
      onChange: (slide, index) => {
        // when the active slide changes
        activeSlide && activeSlide.classList.remove(this.ACTIVE_SLIDE_CLASS);
        slide.classList.add(this.ACTIVE_SLIDE_CLASS);
        activeSlide = slide;
      },
    });

    this.sectionEl
      .querySelector(`${this.NAV_NEXT_BUTTON_SELECTOR}:not(.story-modal_nav-button)`)
      ?.addEventListener('click', () => loop.next({ duration: 0.4, ease: 'power1.inOut' }));
    this.sectionEl
      .querySelector(`${this.NAV_PREV_BUTTON_SELECTOR}:not(.story-modal_nav-button)`)
      ?.addEventListener('click', () => loop.previous({ duration: 0.4, ease: 'power1.inOut' }));
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

    let nextStoryItem;
    const currentStoryItem = currentDialog.closest(this.STORIES_ITEM_SELECTOR) as HTMLElement;
    const currentStoryItemPos = this.storyItemsList.indexOf(currentStoryItem);
    if (currentStoryItemPos === this.storyItemCount - 1) {
      // if last item, loop to first
      nextStoryItem = this.storyItemsList[0];
    } else {
      nextStoryItem = this.storyItemsList[currentStoryItemPos + 1];
    }

    const targetDialog = nextStoryItem.querySelector<HTMLDialogElement>('dialog[data-dialog-id]');
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
  private getInnerActivePosition(
    componentEl: HTMLElement
  ): { index: number; count: number; activeEl: HTMLElement | null } | null {
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
  sectionList.forEach((sectionEl) => {
    new StorySlider(sectionEl);
  });
});
