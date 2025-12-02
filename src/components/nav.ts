export function initNavScrollBehavior() {
  const NAVBAR_WRAPPER_SELECTOR = '.navbar_wrapper';
  const SCROLLED_CLASS = 'is-scrolled';

  const navbarWrapper = document.querySelector(NAVBAR_WRAPPER_SELECTOR);
  if (!navbarWrapper) {
    console.debug('[Nav] No navbar wrapper found');
    return;
  }

  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  ScrollTrigger.create({
    trigger: document.body,
    start: isMobile ? 30 : 100,
    toggleClass: { targets: navbarWrapper, className: SCROLLED_CLASS },
    id: 'nav-scroll-toggle',
    markers: window.IS_DEBUG_MODE,
  });
}

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
