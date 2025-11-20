function tabComponent() {
  const componentList = document.querySelectorAll<HTMLDetailsElement>('[data-el="tabs-component"]');

  componentList.forEach((componentEl) => {
    const summaryEl = componentEl.querySelector('summary');
    summaryEl?.addEventListener('click', (e) => {
      if (componentEl.open) {
        e.preventDefault();
      }
    });

    // for mobile, scroll to the top of the currently open tab
    componentEl.addEventListener('toggle', () => {
      if (window.innerWidth < 787 && componentEl.open) {
        setTimeout(() => {
          componentEl.scrollIntoView({ behavior: 'smooth' });
        }, 1);
      }
    });
  });
}

window.Webflow = window.Webflow || [];
window.Webflow.push(tabComponent);
