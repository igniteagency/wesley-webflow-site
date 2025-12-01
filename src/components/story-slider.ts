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
    window.IS_DEBUG_MODE && console.info('[StorySlider] init');
    this.sectionEl = sectionEl;
    this.storyItemsList = Array.from(this.sectionEl.querySelectorAll(this.STORIES_ITEM_SELECTOR));
    this.storyItemCount = this.storyItemsList.length;

    if (!this.storyItemCount) {
      console.warn('[StorySlider] no story items found');
      return;
    }

    this.initDraggableMainSlider();

    this.sectionEl.querySelectorAll('dialog').forEach((dialogEl) => {
      dialogEl.addEventListener('storyHandoff', (e: Event) => {
        const customEvent = e as CustomEvent;
        const target = customEvent.target as HTMLElement;
        const direction = customEvent.detail.direction;
        this.handoffToAdjacentStory(target, direction);
      });
    });
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
    if (dir === 'next') {
      if (currentStoryItemPos === this.storyItemCount - 1) {
        // if last item, loop to first
        nextStoryItem = this.storyItemsList[0];
      } else {
        nextStoryItem = this.storyItemsList[currentStoryItemPos + 1];
      }
    } else {
      if (currentStoryItemPos === 0) {
        // if first item, loop to last
        nextStoryItem = this.storyItemsList[this.storyItemCount - 1];
      } else {
        nextStoryItem = this.storyItemsList[currentStoryItemPos - 1];
      }
    }

    const targetDialog = nextStoryItem.querySelector<HTMLDialogElement>('dialog[data-dialog-id]');
    if (!targetDialog) {
      console.warn('[StorySlider] target slide has no dialog', { dir });
      return;
    }

    // Close current and open target
    window.IS_DEBUG_MODE &&
      console.log('[StorySlider] handoff', {
        dir,
        fromDialog: currentDialog.getAttribute('data-dialog-id'),
        toDialog: targetDialog.getAttribute('data-dialog-id'),
      });
    this.openDialog(targetDialog);
    this.closeDialog(currentDialog);

    // jump slides in the target dialog
    if (dir === 'next') {
      targetDialog.dispatchEvent(
        new CustomEvent('sliderJump', { bubbles: true, detail: { direction: 'first' } })
      );
    } else {
      targetDialog.dispatchEvent(
        new CustomEvent('sliderJump', { bubbles: true, detail: { direction: 'last' } })
      );
    }
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
window.IS_DEBUG_MODE && console.info('[StorySlider] script loaded');

// Initialize after Webflow is ready to ensure DOM is stable
window.Webflow = window.Webflow || [];
window.Webflow.push(() => {
  sectionList.forEach((sectionEl) => {
    new StorySlider(sectionEl);
  });
});
