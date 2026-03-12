const handleExternalLinks = (): void => {
  const externalLinks = document.querySelectorAll<HTMLAnchorElement>('a[data-external="yes"]');

  externalLinks.forEach((link) => {
    link.setAttribute('target', '_blank');
  });

  const detectExternalLinks = document.querySelectorAll<HTMLAnchorElement>('a[data-detect-external]');
  
  detectExternalLinks.forEach((link) => {
    const href = link.getAttribute('href');
    // Check if it's an absolute link (starts with http:// or https://)
    if (href && /^https?:\/\//i.test(href)) {
      // Check if it's pointing to a different domain
      if (link.hostname !== window.location.hostname) {
        link.setAttribute('target', '_blank');
        // It's good practice to add rel="noopener noreferrer" for security when opening tabs
        link.setAttribute('rel', 'noopener noreferrer');
      }
    }
  });
};

export default handleExternalLinks;
