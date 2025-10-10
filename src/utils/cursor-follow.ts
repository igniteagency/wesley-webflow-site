/**
 * Cursor-follow utility
 *
 * Usage:
 * - Wrap the interactive area with `[data-cursor-follow="container"]`
 * - Place the follower element inside with `[data-cursor-follow="element"]`
 * - Only runs for fine pointers (e.g., mouse/trackpad)
 */

export function initCursorFollow(): void {
  if (!window.matchMedia('(pointer: fine)').matches) return;

  const containers = document.querySelectorAll<HTMLElement>('[data-cursor-follow="container"]');

  containers.forEach((container) => {
    const follower = container.querySelector<HTMLElement>('[data-cursor-follow="element"]');
    if (!follower) return;

    gsap.set(follower, {
      position: 'absolute',
      top: 0,
      left: 0,
      xPercent: -50,
      yPercent: -50,
      // Keep native size; manage visibility with opacity only
      scale: 1,
      opacity: 0,
      transformOrigin: '50% 50%',
      willChange: 'transform',
      force3D: true,
      pointerEvents: 'none',
    });

    let rect = container.getBoundingClientRect();
    const updateRect = () => (rect = container.getBoundingClientRect());
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, { passive: true });

    // Follower size
    let followerW = follower.offsetWidth;
    let followerH = follower.offsetHeight;
    const updateSize = () => {
      followerW = follower.offsetWidth;
      followerH = follower.offsetHeight;
    };
    window.addEventListener('resize', updateSize);

    const margin = 16; // px padding from edge

    const moveX = gsap.quickTo(follower, 'x', { duration: 0.25, ease: 'power3.out' });
    const moveY = gsap.quickTo(follower, 'y', { duration: 0.25, ease: 'power3.out' });

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

      x = clamp(x, minX, maxX);
      y = clamp(y, minY, maxY);

      return { x, y };
    }

    container.addEventListener('pointerenter', (e: PointerEvent) => {
      updateRect();
      updateSize();
      const { x, y } = localXY(e);
      gsap.set(follower, { x, y });
      gsap.to(follower, { opacity: 1, duration: 0.25, ease: 'power3.out' });
      primed = true;
    });

    container.addEventListener('pointermove', (e: PointerEvent) => {
      const { x, y } = localXY(e);
      if (!primed) {
        gsap.set(follower, { x, y });
        primed = true;
        return;
      }
      moveX(x);
      moveY(y);
    });

    container.addEventListener('pointerleave', () => {
      gsap.to(follower, { opacity: 0, duration: 0.2, ease: 'power3.in' });
      primed = false;
    });
  });
}
