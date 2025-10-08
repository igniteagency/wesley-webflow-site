/**
 * Tour CTA: Drawing mask reveal
 *
 * Usage (example SVG structure expected on the page):
 *
 * <svg
 *   data-draw-svg
 *   viewBox="0 0 1000 1000"
 *   preserveAspectRatio="xMidYMid slice"
 *   style="width:100%;height:100%;display:block"
 * >
 *   <rect data-bg-rect x="0" y="0" width="100%" height="100%" fill="var(--_theme---background)" />
 *   <path data-path fill="none" stroke="#ffffff" stroke-linecap="round" stroke-linejoin="round" stroke-width="24" />
 * </svg>
 *
 * This script converts the rect into an overlay that is masked by the path you draw.
 * The drawn path acts as a "hole" in the overlay revealing the content behind it.
 */

type Point = { x: number; y: number };

class TourCtaDrawingReveal {
  private static instanceCount = 0;

  constructor() {
    this.init();
  }

  private init(): void {
    const svgs = document.querySelectorAll<SVGSVGElement>('svg[data-draw-svg]');
    svgs.forEach((svg) => this.setupSVG(svg));
  }

  private setupSVG(svg: SVGSVGElement): void {
    const overlayRect = svg.querySelector<SVGRectElement>('[data-bg-rect]');
    const visiblePath = svg.querySelector<SVGPathElement>('[data-path]');

    if (!overlayRect || !visiblePath) {
      console.error('Tour CTA: Missing required elements', { overlayRect, visiblePath, svg });
      return;
    }

    // Ensure pointer drawing works on touch without scrolling
    (svg.style as any).touchAction = 'none';

    // Create mask infrastructure
    const maskId = `draw-mask-${++TourCtaDrawingReveal.instanceCount}`;
    const defs = this.ensureDefs(svg);
    const mask = this.createMask(svg, defs, maskId);

    // Path inside mask (black stroke cuts a hole in overlay)
    const maskPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    maskPath.setAttribute('fill', 'none');
    maskPath.setAttribute('stroke', 'black');
    maskPath.setAttribute('stroke-linecap', 'round');
    maskPath.setAttribute('stroke-linejoin', 'round');
    maskPath.setAttribute('stroke-width', visiblePath.getAttribute('stroke-width') || '24');
    mask.appendChild(maskPath);

    // Apply mask to overlay rect so drawn path reveals background
    overlayRect.setAttribute('mask', `url(#${maskId})`);

    // Track drawing across multiple segments (each drag gesture is one segment)
    const segments: Point[][] = [];
    let current: Point[] | null = null;
    let isDrawing = false;

    const updatePathFromSegments = () => {
      const d = segments
        .filter((seg) => seg.length > 0)
        .map((seg) => this.pointsToPathD(seg))
        .join(' ');
      visiblePath.setAttribute('d', d);
      maskPath.setAttribute('d', d);
    };

    const onPointerDown = (e: PointerEvent) => {
      // Avoid scrolling on touch while drawing
      if (e.pointerType === 'touch') e.preventDefault();
      svg.setPointerCapture?.(e.pointerId);

      const p = this.clientToSvgPoint(svg, e.clientX, e.clientY);
      current = [p];
      segments.push(current);
      isDrawing = true;
      updatePathFromSegments();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDrawing || !current) return;
      if (e.pointerType === 'touch') e.preventDefault();

      const p = this.clientToSvgPoint(svg, e.clientX, e.clientY);

      // Throttle points by distance to keep path performant
      const last = current[current.length - 1];
      const dx = p.x - last.x;
      const dy = p.y - last.y;
      const dist2 = dx * dx + dy * dy;
      const minDist = 2; // in viewBox units (~px if viewBox ~ px)
      if (dist2 < minDist * minDist) return;

      current.push(p);
      updatePathFromSegments();
    };

    const endDrawing = (e?: PointerEvent) => {
      if (e && e.pointerType === 'touch') e.preventDefault();
      isDrawing = false;
      current = null;
    };

    svg.addEventListener('pointerdown', onPointerDown);
    svg.addEventListener('pointermove', onPointerMove, { passive: false });
    svg.addEventListener('pointerup', endDrawing);
    svg.addEventListener('pointercancel', endDrawing);
    svg.addEventListener('pointerleave', endDrawing);

    // Optional: clear drawing with Escape key when SVG is focused/active
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      segments.length = 0;
      updatePathFromSegments();
    };
    // Attach key listener when the user interacts with the SVG
    svg.addEventListener('keydown', onKeyDown);
    svg.setAttribute('tabindex', svg.getAttribute('tabindex') ?? '0');
  }

  private ensureDefs(svg: SVGSVGElement): SVGDefsElement {
    let defs = svg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svg.insertBefore(defs, svg.firstChild);
    }
    return defs as SVGDefsElement;
  }

  private createMask(svg: SVGSVGElement, defs: SVGDefsElement, id: string): SVGMaskElement {
    const vb = svg.viewBox.baseVal;
    const { x, y, width, height } =
      vb && vb.width && vb.height
        ? { x: vb.x, y: vb.y, width: vb.width, height: vb.height }
        : { x: 0, y: 0, width: svg.clientWidth || 1000, height: svg.clientHeight || 1000 };

    const mask = document.createElementNS('http://www.w3.org/2000/svg', 'mask');
    mask.setAttribute('id', id);
    mask.setAttribute('maskUnits', 'userSpaceOnUse');
    mask.setAttribute('x', String(x));
    mask.setAttribute('y', String(y));
    mask.setAttribute('width', String(width));
    mask.setAttribute('height', String(height));

    // White rect makes the overlay fully visible; black strokes will cut holes
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('x', String(x));
    bgRect.setAttribute('y', String(y));
    bgRect.setAttribute('width', String(width));
    bgRect.setAttribute('height', String(height));
    bgRect.setAttribute('fill', 'white');
    mask.appendChild(bgRect);

    defs.appendChild(mask);
    return mask;
  }

  private clientToSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number): Point {
    // Use CTM to transform client coords to SVG user space
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    const inv = ctm ? ctm.inverse() : null;
    if (!inv) return { x: 0, y: 0 };
    const svgP = pt.matrixTransform(inv);
    return { x: svgP.x, y: svgP.y };
  }

  private pointsToPathD(points: Point[]): string {
    if (!points.length) return '';
    if (points.length === 1) {
      // Render a dot by creating a tiny line
      const p = points[0];
      return `M ${p.x} ${p.y} L ${p.x + 0.01} ${p.y + 0.01}`;
    }
    const [first, ...rest] = points;
    const line = rest.map((p) => `L ${p.x} ${p.y}`).join(' ');
    return `M ${first.x} ${first.y} ${line}`;
  }
}

// Auto-init
new TourCtaDrawingReveal();
