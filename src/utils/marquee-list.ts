/**
 * Duplicates marquee list for infinite loop
 */
export class MarqueeList {
  private SPEED_MODIFIER = 50;
  private selector = '[data-el="marquee-list"]';
  private resizeTimeout: number | undefined;

  constructor() {
    this.duplicateAll();
    window.addEventListener('resize', () => {
      // debounced resize adjust marquee speed
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        document.querySelectorAll(this.selector).forEach((el) => {
          this.setMarqueeWidth(el);
        });
      }, 200);
    });
  }

  duplicateAll() {
    const marqueeLists = document.querySelectorAll(this.selector);

    marqueeLists.forEach((el) => {
      const marqueeList = el;
      this.setMarqueeWidth(marqueeList);

      // Add duplicating class to stop animation until duplication is done
      marqueeList.parentElement?.classList.add('is-duplicating');

      const clone = marqueeList.cloneNode(true) as HTMLElement;

      // Insert the clone as the next sibling
      marqueeList.parentNode?.insertBefore(clone, marqueeList.nextSibling);

      // Remove duplicating class after duplication is done
      setTimeout(() => {
        marqueeList.parentElement?.classList.remove('is-duplicating');
      }, 1);
    });
  }

  private setMarqueeWidth(marqueeList: HTMLElement) {
    const width = marqueeList.offsetWidth;
    const duration = width / this.SPEED_MODIFIER;
    marqueeList.style.setProperty('--duration', `${duration}s`);
  }
}

// Backwards-compatible wrapper to preserve existing API
export function duplicateMarqueeList() {
  new MarqueeList();
}
