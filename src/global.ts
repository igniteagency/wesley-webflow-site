import { animatedDetailsAccordions } from '$components/accordions';
import Dialog from '$components/dialog';
import { setCurrentYear } from '$utils/current-year';
import '$utils/disable-webflow-scroll';
import { disableWebflowAnchorSmoothScroll } from '$utils/disable-webflow-scroll';
import handleExternalLinks from '$utils/external-link';
import addMainElementId from '$utils/main-element-id';
import { duplicateMarqueeList } from '$utils/marquee-list';

gsap.registerPlugin(ScrollTrigger);

window.Webflow = window.Webflow || [];
window.Webflow?.push(() => {
  setTimeout(() => {
    window.WF_IX = Webflow.require('ix3');
    console.debug('Webflow IX3 globalised:', window.WF_IX);
  }, 100);

  // Set current year on respective elements
  setCurrentYear();
  addMainElementId();
  handleExternalLinks();

  initComponents();
  UIFunctions();
  webflowOverrides();
});

function initComponents() {
  new Dialog();
}

function UIFunctions() {
  duplicateMarqueeList();
  animatedDetailsAccordions();
}

function webflowOverrides() {
  disableWebflowAnchorSmoothScroll();
}
