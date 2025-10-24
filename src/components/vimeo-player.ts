/**
 * Vimeo Player Component
 *
 * Usage:
 * - Wrap a Vimeo iframe with `[data-vimeo-container]`.
 * - Inside container, include:
 *   - `[data-vimeo-player]` on the iframe
 *   - `[data-vimeo-play-pause-button]` with icons `[data-vimeo-play-icon]` and `[data-vimeo-pause-icon]`
 *   - Optional audio toggle `[data-vimeo-audio-button]` with icons `[data-vimeo-audio-on]` and `[data-vimeo-audio-off]`
 * - Optional attributes on container:
 *   - `data-vimeo-start="<number>"` starting time (seconds, default 0)
 *   - `data-vimeo-end="<number>"` end time (seconds, loops back to start)
 *   - `data-vimeo-hover-play` to enable hover play/pause while in view (boolean presence)
 */

class VimeoPlayers {
  private static readonly CONTAINER_SELECTOR = '[data-vimeo-container]';
  private static readonly IFRAME_SELECTOR = '[data-vimeo-player]';
  private static readonly BTN_PLAY_PAUSE = '[data-vimeo-play-pause-button]';
  private static readonly ICON_PLAY = '[data-vimeo-play-icon]';
  private static readonly ICON_PAUSE = '[data-vimeo-pause-icon]';
  private static readonly BTN_AUDIO = '[data-vimeo-audio-button]';
  private static readonly ICON_AUDIO_ON = '[data-vimeo-audio-on]';
  private static readonly ICON_AUDIO_OFF = '[data-vimeo-audio-off]';

  constructor() {
    this.initializeAll();
  }

  private initializeAll() {
    const containers = document.querySelectorAll<HTMLElement>(VimeoPlayers.CONTAINER_SELECTOR);
    if (containers.length === 0) {
      console.warn('[Vimeo] No containers found for selector', VimeoPlayers.CONTAINER_SELECTOR);
    }
    containers.forEach((container, idx) => this.initContainer(container, idx));
    console.info('[Vimeo] All players initialized:', containers.length);
  }

  private initContainer(container: HTMLElement, index = 0) {
    const iframe = container.querySelector<HTMLIFrameElement>(VimeoPlayers.IFRAME_SELECTOR);
    if (!iframe) {
      console.error('[Vimeo] iframe not found in container', container);
      return;
    }

    // Ensure iframe has permissive attributes and inline playback
    const currentAllow = (iframe.getAttribute('allow') || '').trim();
    const neededAllows = ['autoplay', 'fullscreen', 'picture-in-picture'];
    const allowParts = currentAllow
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);
    neededAllows.forEach((tok) => {
      if (!allowParts.some((p) => p.toLowerCase() === tok)) allowParts.push(tok);
    });
    iframe.setAttribute('allow', allowParts.join('; '));

    const src = iframe.getAttribute('src') || '';
    if (src) {
      let newSrc = src;
      if (!/[?&]playsinline=1/.test(newSrc)) {
        const sep = newSrc.includes('?') ? '&' : '?';
        newSrc = `${newSrc}${sep}playsinline=1`;
      }
      if (!/[?&]muted=1/.test(newSrc)) {
        const sep2 = newSrc.includes('?') ? '&' : '?';
        newSrc = `${newSrc}${sep2}muted=1`;
      }
      if (newSrc !== src) iframe.setAttribute('src', newSrc);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const VimeoGlobal: any = (window as any).Vimeo;
    if (!VimeoGlobal || !VimeoGlobal.Player) {
      console.error('[Vimeo] Vimeo API not available. Ensure script is loaded.');
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const player: any = new VimeoGlobal.Player(iframe);

    // Optional controls (safe to omit in DOM)
    const playPauseButton = container.querySelector<HTMLElement>(VimeoPlayers.BTN_PLAY_PAUSE);
    const playIcon = container.querySelector<HTMLElement>(VimeoPlayers.ICON_PLAY);
    const pauseIcon = container.querySelector<HTMLElement>(VimeoPlayers.ICON_PAUSE);
    const audioButton = container.querySelector<HTMLElement>(VimeoPlayers.BTN_AUDIO);
    const audioOnIcon = container.querySelector<HTMLElement>(VimeoPlayers.ICON_AUDIO_ON);
    const audioOffIcon = container.querySelector<HTMLElement>(VimeoPlayers.ICON_AUDIO_OFF);

    // Config: snippet start + (end or duration). Defaults to 3s snippet from 0s
    const snippetStart = Number.parseFloat(container.getAttribute('data-vimeo-start') || '0') || 0;
    const endAttr = container.getAttribute('data-vimeo-end');
    const durationAttr = container.getAttribute('data-vimeo-duration');
    const snippetEnd = (() => {
      if (endAttr !== null && endAttr !== '') return Number.parseFloat(endAttr);
      const dur = durationAttr !== null ? Number.parseFloat(durationAttr) : 3;
      return snippetStart + (Number.isFinite(dur) ? dur : 3);
    })();

    const fullStartAttr = container.getAttribute('data-vimeo-full-start');
    const fullStart = fullStartAttr !== null ? Number.parseFloat(fullStartAttr) : 0;

    let isSnippetActive = false;
    let isFullMode = false; // set true after user click to watch full video
    let audioEnabled = false;

    // Debug info
    if (window.IS_DEBUG_MODE) {
      console.debug('[Vimeo] initContainer', {
        index,
        snippetStart,
        snippetEnd,
        fullStart,
        hasPlayPauseButton: !!playPauseButton,
        hasAudioButton: !!audioButton,
        iframeAllow: iframe.getAttribute('allow'),
        src: iframe.getAttribute('src'),
      });
    }
    // Warn if iframe missing autoplay permission (can affect hover preview)
    const allowAttr = (iframe.getAttribute('allow') || '').toLowerCase();
    if (!allowAttr.includes('autoplay')) {
      console.warn(
        '[Vimeo] iframe is missing `allow="autoplay"` which can prevent programmatic play. Consider adding it.'
      );
    }

    const showPlayIcon = () => {
      playIcon?.classList.remove('hide-this');
      pauseIcon?.classList.add('hide-this');
    };
    const showPauseIcon = () => {
      playIcon?.classList.add('hide-this');
      pauseIcon?.classList.remove('hide-this');
    };

    // Keep snippet bounded and loop while hovering
    let isRewindingSnippet = false;
    player.on('timeupdate', (data: { seconds: number }) => {
      if (!isSnippetActive || isFullMode) return;
      const t = typeof data?.seconds === 'number' ? data.seconds : NaN;
      if (!Number.isFinite(t)) return;
      // small epsilon to catch boundary without thrashing
      const EPS = 0.05;
      if (!isRewindingSnippet && t >= snippetEnd - EPS) {
        isRewindingSnippet = true;
        // Jump back to start and continue playing muted
        player.setCurrentTime(snippetStart).finally(() => {
          isRewindingSnippet = false;
        });
      }
    });

    // Initial setup: muted and positioned at snippet start, paused
    player
      .ready()
      .then(() => player.setMuted(true))
      .then(() => player.setVolume(0))
      .then(() => player.setCurrentTime(snippetStart))
      .then(() => player.pause())
      .then(() => {
        showPlayIcon();
        console.info('[Vimeo] Player ready (paused at snippet start)');
      })
      .catch((error: unknown) => {
        console.error('[Vimeo] Error during init:', error);
      });

    // Hover snippet playback (always enabled, ignored once in full mode)
    container.addEventListener('mouseenter', () => {
      if (isFullMode) return; // do not interfere with full playback
      isSnippetActive = true;
      if (window.IS_DEBUG_MODE) console.debug('[Vimeo] mouseenter -> start snippet');
      player
        .setMuted(true)
        .then(() => player.setVolume(0))
        .then(() => player.setCurrentTime(snippetStart))
        .then(() => player.play())
        .then(() => showPauseIcon())
        .catch((err: unknown) => console.error('[Vimeo] Error playing snippet:', err));
    });

    container.addEventListener('mouseleave', () => {
      if (isFullMode) return;
      if (!isSnippetActive) return;
      if (window.IS_DEBUG_MODE) console.debug('[Vimeo] mouseleave -> stop snippet');
      player
        .pause()
        .then(() => player.setCurrentTime(snippetStart))
        .then(() => showPlayIcon())
        .finally(() => {
          isSnippetActive = false;
        })
        .catch((err: unknown) => console.error('[Vimeo] Error stopping snippet:', err));
    });

    // Click to play full video with sound
    container.addEventListener('click', () => {
      isFullMode = true;
      if (window.IS_DEBUG_MODE) console.debug('[Vimeo] click -> full mode start');
      player
        .setMuted(false)
        .then(() => player.setVolume(1))
        .then(() => {
          audioEnabled = true;
          // If we were not already playing (e.g., not hovering), start from fullStart
          return player.getPaused();
        })
        .then((paused: boolean) => {
          if (paused) {
            return player.setCurrentTime(fullStart);
          }
        })
        .then(() => player.play())
        .then(() => showPauseIcon())
        .catch((err: unknown) => console.error('[Vimeo] Error starting full playback:', err));
    });

    // Optional: buttons if present (safe no-ops if absent)
    if (playPauseButton) {
      playPauseButton.addEventListener('click', () => {
        player.getPaused().then((paused: boolean) => {
          if (paused) {
            player.play().then(showPauseIcon);
          } else {
            player.pause().then(showPlayIcon);
          }
        });
      });
    }

    if (audioButton) {
      audioButton.addEventListener('click', () => {
        const nextEnabled = !audioEnabled;
        player
          .setVolume(nextEnabled ? 1 : 0)
          .then(() => {
            audioEnabled = nextEnabled;
            if (audioEnabled) {
              audioOffIcon?.classList.add('hide-this');
              audioOnIcon?.classList.remove('hide-this');
            } else {
              audioOnIcon?.classList.add('hide-this');
              audioOffIcon?.classList.remove('hide-this');
            }
          })
          .catch((err: unknown) => console.error('[Vimeo] Error toggling audio:', err));
      });
    }

    // Reflect player events into icons if present
    player.on('play', () => showPauseIcon());
    player.on('pause', () => showPlayIcon());
  }
}

// Quick confirmation the script file itself loaded
console.info('[Vimeo] script loaded');

// Always request the Vimeo API script (if loader available)
if (typeof window.loadScript === 'function') {
  window.loadScript('https://player.vimeo.com/api/player.js', { name: 'vimeo' });
} else {
  console.warn('[Vimeo] window.loadScript is not defined. Include dist/prod/entry.js first.');
}

// Initialize after Webflow is ready; ensure Vimeo API is available first
window.Webflow = window.Webflow || [];
window.Webflow.push(() => {
  // If Vimeo already available, init immediately; else wait for scriptLoaded
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hasVimeo = !!(window as any).Vimeo?.Player;
  if (hasVimeo) {
    new VimeoPlayers();
  } else {
    document.addEventListener(
      'scriptLoaded:vimeo',
      () => {
        new VimeoPlayers();
      },
      { once: true }
    );
  }
});
