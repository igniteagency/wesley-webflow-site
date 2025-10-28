export function initNavAnimation() {
  const NAV_LINKS_LIST_SELECTOR = '.navbar_menu-link-list';
  const NAV_LINKS_SELECTOR = '.navbar_menu-link';

  const LINK_FADE_STAGGER_DELAY_MS = 70;
  const ease = gsap.parseEase('sine.out');

  const navLinksList = document.querySelectorAll(NAV_LINKS_LIST_SELECTOR);

  navLinksList.forEach((list, listIndex) => {
    const navLinks = list.querySelectorAll(NAV_LINKS_SELECTOR);

    navLinks.forEach((link, linkIndex) => {
      const progress = linkIndex / (navLinks.length - 1);
      const easedProgress = ease(progress);
      const delay = easedProgress * (navLinks.length - 1) * LINK_FADE_STAGGER_DELAY_MS;
      link.style.setProperty('--i', `${delay}`);
    });
  });
}
