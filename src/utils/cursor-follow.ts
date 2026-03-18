export function initCursorFollow(): void {
  if (!window.matchMedia('(pointer: fine)').matches) return;

  const containers = document.querySelectorAll<HTMLElement>('[data-cursor-follow="container"]');

  containers.forEach((container) => {
    // Limits element within the parent boundaries
    let isClamp = true;
    if (container.getAttribute('data-cursor-follow-clamp') === 'false') {
      isClamp = false;
    }

    const followers = gsap.utils.toArray<HTMLElement>(
      container.querySelectorAll('[data-cursor-follow="element"]')
    );
    if (followers.length === 0) return;

    gsap.set(followers, {
      position: 'absolute',
      top: 0,
      left: 0,
      xPercent: -50,
      yPercent: -50,
      scale: 1,
      opacity: 0,
      transformOrigin: '50% 50%',
      willChange: 'transform',
      force3D: true,
      pointerEvents: 'none',
    });

    let rect = container.getBoundingClientRect();
    const updateRect = () => (rect = container.getBoundingClientRect());

    // Follower size
    let followerW = 0;
    let followerH = 0;
    const updateSize = () => {
      const activeFollower = followers.find((f) => f.offsetWidth > 0) || followers[0];
      followerW = activeFollower.offsetWidth;
      followerH = activeFollower.offsetHeight;
    };

    // Initial sync
    updateRect();
    updateSize();

    window.addEventListener('resize', () => {
      updateRect();
      updateSize();
    });
    window.addEventListener('scroll', updateRect, { passive: true });

    const margin = 16; // px padding from edge

    // Create quickTo for each follower to ensure high performance
    const moveXFns = followers.map((f) =>
      gsap.quickTo(f, 'x', { duration: 0.25, ease: 'power3.out' })
    );
    const moveYFns = followers.map((f) =>
      gsap.quickTo(f, 'y', { duration: 0.25, ease: 'power3.out' })
    );

    const cssX = gsap.quickSetter(container, '--x', 'px');
    const cssY = gsap.quickSetter(container, '--y', 'px');

    let primed = false;

    function clamp(val: number, min: number, max: number): number {
      return Math.min(Math.max(val, min), max);
    }

    function localXY(e: PointerEvent): { x: number; y: number } {
      // Raw coords relative to container
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;

      // Clamp so follower stays fully visible
      const minX = followerW / 2 + margin;
      const maxX = rect.width - followerW / 2 - margin;
      const minY = followerH / 2 + margin;
      const maxY = rect.height - followerH / 2 - margin;

      // Safety check if rect is 0
      if (rect.width > 0) {
        x = clamp(x, minX, maxX);
        y = clamp(y, minY, maxY);
      if (isClamp) {
        const minX = followerW / 2 + margin;
        const maxX = rect.width - followerW / 2 - margin;
        const minY = followerH / 2 + margin;
        const maxY = rect.height - followerH / 2 - margin;

        // Safety check if rect is 0
        if (rect.width > 0) {
          x = clamp(x, minX, maxX);
          y = clamp(y, minY, maxY);
        }
      }

      return { x, y };
    }

    container.addEventListener('pointerenter', (e: PointerEvent) => {
      updateRect();
      updateSize();
      const { x, y } = localXY(e);
      gsap.set(container, { '--x': x, '--y': y });
      gsap.set(followers, { x, y });
      gsap.to(followers, { opacity: 1, duration: 0.25, ease: 'power3.out' });
      primed = true;
    });

    container.addEventListener('pointermove', (e: PointerEvent) => {
      const { x, y } = localXY(e);

      if (!primed) {
        gsap.set(followers, { x, y });
        gsap.set(container, { '--x': x, '--y': y });
        primed = true;
        return;
      }
      moveXFns.forEach((fn) => fn(x));
      moveYFns.forEach((fn) => fn(y));
      cssX(x);
      cssY(y);
    });

    container.addEventListener('pointerleave', () => {
      gsap.to(followers, { opacity: 0, duration: 0.2, ease: 'power3.in' });
      gsap.set(container, { '--x': '50%', '--y': '50%' });
      primed = false;
    });
  });
}
