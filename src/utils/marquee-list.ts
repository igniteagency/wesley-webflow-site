/**
 * Duplicates marquee list for infinite loop
 */

export function duplicateMarqueeList() {
  const marqueeLists = document.querySelectorAll('[data-el="marquee-list"]');

  marqueeLists.forEach((el) => {
    const marqueeList = el;

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
