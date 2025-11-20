/**
 * Content Modal Component
 * Targets <dialog> elements with attribute [data-el="content-modal"]
 * Handles internal image slider functionality with loop support
 */
class ContentModal {
  private readonly COMPONENT_SELECTOR = 'dialog[data-el="content-modal"]';
  private readonly PREV_BTN_SELECTOR = '[data-slider-el="nav-prev"]';
  private readonly NEXT_BTN_SELECTOR = '[data-slider-el="nav-next"]';
  private readonly SCROLL_CONTAINER_SELECTOR = '[data-el="content-modal-scroll-container"]';

  constructor() {
    this.init();
  }

  private init() {
    const modals = document.querySelectorAll<HTMLDialogElement>(this.COMPONENT_SELECTOR);

    modals.forEach((modal) => {
      this.initSlider(modal);
    });
  }

  private initSlider(modal: HTMLDialogElement) {
    const prevBtn = modal.querySelector<HTMLElement>(this.PREV_BTN_SELECTOR);
    const nextBtn = modal.querySelector<HTMLElement>(this.NEXT_BTN_SELECTOR);
    const container = modal.querySelector<HTMLElement>(this.SCROLL_CONTAINER_SELECTOR);

    if (!container) return;

    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.handleScroll(container, 'prev'));
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.handleScroll(container, 'next'));
    }
  }

  private handleScroll(container: HTMLElement, direction: 'prev' | 'next') {
    const scrollAmount = container.clientWidth;
    const maxScroll = container.scrollWidth - container.clientWidth;
    const currentScroll = container.scrollLeft;
    const tolerance = 5; // Tolerance for scroll position calculation

    let targetScroll = 0;

    if (direction === 'next') {
      // If we are at the end (or close to it), loop to start
      if (currentScroll >= maxScroll - tolerance) {
        targetScroll = 0;
      } else {
        targetScroll = currentScroll + scrollAmount;
      }
    } else {
      // If we are at the start (or close to it), loop to end
      if (currentScroll <= tolerance) {
        targetScroll = maxScroll;
      } else {
        targetScroll = currentScroll - scrollAmount;
      }
    }

    container.scrollTo({
      left: targetScroll,
      behavior: 'smooth',
    });
  }
}

window.Webflow = window.Webflow || [];
window.Webflow.push(() => {
  new ContentModal();
});
