import { animatedDetailsAccordions } from '$components/accordions';
import Dialog from '$components/dialog';
import { initNavAnimation, initNavScrollBehavior } from '$components/nav';
import { setCurrentYear } from '$utils/current-year';
import { initCursorFollow } from '$utils/cursor-follow';
import '$utils/disable-webflow-scroll';
import { disableWebflowAnchorSmoothScroll } from '$utils/disable-webflow-scroll';
import handleExternalLinks from '$utils/external-link';
import addMainElementId from '$utils/main-element-id';
import { duplicateMarqueeList } from '$utils/marquee-list';

window.Webflow = window.Webflow || [];
window.Webflow?.push(() => {
  setTimeout(() => {
    window.WF_IX = Webflow.require('ix3');
    console.debug('Webflow IX3 globalised:', window.WF_IX);
  }, 100);

  initNavScrollBehavior();
  initNavAnimation();

  // Set current year on respective elements
  setCurrentYear();
  addMainElementId();
  handleExternalLinks();

  initComponents();
  UIFunctions();
  initCursorFollow();

  webflowOverrides();

  loadScrollTimelineCSSPolyfill();
});

function initComponents() {
  new Dialog();
}

function UIFunctions() {
  duplicateMarqueeList();
  animatedDetailsAccordions();

  window.conditionalLoadScript('.swiper', 'components/slider.js');

  // Counter Loader
  window.conditionalLoadScript('[data-el="counter"]', 'components/counter.js');
  window.conditionalLoadScript('[data-el="content-modal"]', 'components/content-modal.js');
}

function webflowOverrides() {
  disableWebflowAnchorSmoothScroll();
}

function loadScrollTimelineCSSPolyfill() {
  window.loadScript('https://flackr.github.io/scroll-timeline/dist/scroll-timeline.js');
}
