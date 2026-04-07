/**
 * Interview Video Player Component
 * Handles videos in .interviews_video-wrap elements using Plyr.io
 * - Lazy loads videos when they come into view
 * - Plays muted video on hover (only on desktop/non-touch devices)
 * - Plays video with audio on click/tap
 * - Thumbnail reappears when the video is not playing
 * - No custom player controls
 */

class InlineVideoPlayer {
  private readonly VIDEO_WRAP_SELECTOR = '[data-video-el="vimeo"]';
  private readonly VIDEO_URL_ATTR = 'data-video-url';
  private readonly VIDEO_LOOP_ATTR = 'data-video-loop';
  private readonly VIDEO_AUTOPLAY_ATTR = 'data-video-autoplay';

  private readonly INTERVIEW_VIDEO_ATTR = 'data-video-type';
  private readonly INTERVIEW_VIDEO_ATTR_VALUE = 'interview-reel';
  private readonly PLAY_STATE_ATTR = 'data-play-state';
  private readonly PLAY_STATE_HOVER = 'hover';
  private readonly PLAY_STATE_PLAYING = 'playing';
  private readonly PLAY_STATE_PAUSED = 'paused';
  private readonly PLAY_STATE_NONE = 'none';

  private observer: IntersectionObserver | null = null;
  private videoInstances: Map<HTMLElement, any> = new Map();
  private currentlyClickPlaying: HTMLElement | null = null;

  constructor() {
    this.initializeAll();
  }

  private extractVideoId(url: string): string {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? match[1] : '';
  }

  private initializeAll(): void {
    console.debug(
      '[InlineVideoPlayer] Looking for video wraps with selector:',
      this.VIDEO_WRAP_SELECTOR
    );
    const videoWraps = document.querySelectorAll(this.VIDEO_WRAP_SELECTOR);
    console.debug('[InlineVideoPlayer] Found video wraps:', videoWraps.length);

    if (videoWraps.length === 0) {
      console.debug('[InlineVideoPlayer] No video wraps found');
      return;
    }

    // Create observer
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement;
            if (target.tagName === 'SECTION') {
              target
                .querySelectorAll(this.VIDEO_WRAP_SELECTOR)
                .forEach((wrap) => this.initializeVideo(wrap as HTMLElement));
              this.observer!.unobserve(target);
            }
          }
        });
      },
      { rootMargin: '500px', threshold: 0 }
    );

    // Group videos by parent section
    const sectionMap = new Map<HTMLElement, HTMLElement[]>();
    videoWraps.forEach((wrap) => {
      const section = wrap.closest('section') as HTMLElement;
      if (section) {
        if (!sectionMap.has(section)) sectionMap.set(section, []);
        sectionMap.get(section)!.push(wrap);
      } else {
        this.initializeVideo(wrap);
      }
    });

    // Observe sections
    sectionMap.forEach((videos, section) => {
      this.observer!.observe(section);
      window.IS_DEBUG_MODE &&
        console.debug(`[InlineVideoPlayer] Observing section with ${videos.length} videos`);
    });

    window.IS_DEBUG_MODE &&
      console.debug('[InlineVideoPlayer] Observing', sectionMap.size, 'sections total');
  }

  private getLocalThumbnailUrl(wrap: HTMLElement): string | null {
    const thumbImg = wrap.querySelector<HTMLImageElement>('img');
    if (thumbImg?.src) {
      window.IS_DEBUG_MODE &&
        console.debug('[InlineVideoPlayer] Found local thumbnail image:', thumbImg.src);
      return thumbImg.src;
    }

    return null;
  }

  private async pauseVideo(wrap: HTMLElement): Promise<void> {
    const instance = this.videoInstances.get(wrap);
    const player = instance?.player;

    if (!player) {
      console.warn('[InlineVideoPlayer] No player instance found for wrap:', wrap);
      return;
    }

    player.pause();
    instance.isClickPlaying = false;
    wrap.setAttribute(this.PLAY_STATE_ATTR, this.PLAY_STATE_PAUSED);
    window.IS_DEBUG_MODE &&
      console.debug('[InlineVideoPlayer] Paused video:', wrap.getAttribute(this.VIDEO_URL_ATTR));

    if (this.currentlyClickPlaying === wrap) {
      this.currentlyClickPlaying = null;
    }
  }

  private async initializeVideo(wrap: HTMLElement): Promise<void> {
    if (this.videoInstances.has(wrap)) return;

    console.debug(
      '[InlineVideoPlayer] Initializing video for wrap:',
      wrap,
      'Plyr available:',
      !!window.Plyr
    );

    const videoUrl = wrap.getAttribute(this.VIDEO_URL_ATTR);
    const isInterviewReel =
      wrap.getAttribute(this.INTERVIEW_VIDEO_ATTR) === this.INTERVIEW_VIDEO_ATTR_VALUE;
    const shouldLoop = wrap.getAttribute(this.VIDEO_LOOP_ATTR) === 'true';
    const shouldAutoplay = wrap.getAttribute(this.VIDEO_AUTOPLAY_ATTR) === 'true';

    const thumbnailUrl = this.getLocalThumbnailUrl(wrap);
    if (thumbnailUrl) {
      wrap.style.setProperty('--thumb', `url('${thumbnailUrl}')`);
    }

    const canHover = !window.matchMedia('(pointer: coarse)').matches;
    const videoId = this.extractVideoId(videoUrl!);
    console.debug(
      '[InlineVideoPlayer] Video URL:',
      videoUrl,
      'Extracted ID:',
      videoId,
      'Thumbnail URL:',
      thumbnailUrl
    );

    // Create a container div for Plyr
    const playerContainer = document.createElement('div');
    playerContainer.setAttribute('data-plyr-provider', 'vimeo');
    playerContainer.setAttribute('data-plyr-embed-id', videoId);
    playerContainer.setAttribute('data-poster', thumbnailUrl || '');
    wrap.appendChild(playerContainer);

    try {
      const player = new window.Plyr(playerContainer, {
        autoplay: shouldAutoplay,
        muted: canHover ? true : shouldAutoplay,
        loop: { active: shouldLoop },
        controls: [],
        clickToPlay: false,
        hideControls: true,
        fullscreen: { enabled: false },
        keyboard: { focused: false, global: false },
        storage: { enabled: false },
        quality: { default: 720, options: [] },
        tooltips: { controls: false, seek: false },
        resetOnEnd: true,
        autopause: true,
        playsinline: true,
        vimeo: { speed: false, background: true },
        // Remove source since we're using data attributes
      });

      this.videoInstances.set(wrap, { player, isClickPlaying: false });

      console.debug(
        '[InlineVideoPlayer] Plyr initialized for wrap:',
        wrap,
        'Player container:',
        playerContainer,
        'Player:',
        player
      );
      console.debug(
        '[InlineVideoPlayer] Player container children after init:',
        playerContainer.children
      );

      player.on('ready', () => {
        console.debug(
          '[InlineVideoPlayer] Plyr ready event fired for wrap:',
          wrap,
          'player container:',
          playerContainer
        );

        if (!shouldAutoplay) {
          player.currentTime = 1;
          if (canHover) player.volume = 1;
        }
        wrap.setAttribute(this.PLAY_STATE_ATTR, this.PLAY_STATE_NONE);
      });

      player.on('pause', () => {
        const instance = this.videoInstances.get(wrap);
        if (instance) {
          instance.isClickPlaying = false;
        }
      });

      if (isInterviewReel) {
        const videoInstance = this.videoInstances.get(wrap);

        if (canHover) {
          wrap.addEventListener('click', async () => {
            if (videoInstance.isClickPlaying) {
              await this.pauseVideo(wrap);
              return;
            }

            // Pause previously playing video
            if (this.currentlyClickPlaying && this.currentlyClickPlaying !== wrap) {
              await this.pauseVideo(this.currentlyClickPlaying);
            }

            videoInstance.isClickPlaying = true;
            this.currentlyClickPlaying = wrap;
            wrap.setAttribute(this.PLAY_STATE_ATTR, this.PLAY_STATE_PLAYING);

            if (canHover) {
              player.muted = false;
              player.volume = 1;
            }

            const playPromise = player.play();

            try {
              await playPromise;
              player.currentTime = 0;

              window.IS_DEBUG_MODE &&
                console.debug('[InlineVideoPlayer] Playing video with sound:', videoUrl);
            } catch (err) {
              console.error('[InlineVideoPlayer] Play failed:', err);
              videoInstance.isClickPlaying = false;
              this.currentlyClickPlaying = null;
              wrap.setAttribute(this.PLAY_STATE_ATTR, this.PLAY_STATE_NONE);
            }
          });

          if (canHover) {
            wrap.addEventListener('mouseenter', () => {
              if (videoInstance.isClickPlaying) return;
              player.muted = true;
              player.play();
              wrap.setAttribute(this.PLAY_STATE_ATTR, this.PLAY_STATE_HOVER);
              window.IS_DEBUG_MODE &&
                console.debug('[InlineVideoPlayer] Hover play (muted):', videoUrl);
            });

            wrap.addEventListener('mouseleave', () => {
              if (videoInstance.isClickPlaying) return;
              player.pause();
              wrap.setAttribute(this.PLAY_STATE_ATTR, this.PLAY_STATE_NONE);
              window.IS_DEBUG_MODE && console.debug('[InlineVideoPlayer] Hover pause:', videoUrl);
            });
          }
        }
      }

      player.on('ended', () => {
        this.videoInstances.get(wrap).isClickPlaying = false;
        if (this.currentlyClickPlaying === wrap) {
          this.currentlyClickPlaying = null;
        }
        wrap.setAttribute(this.PLAY_STATE_ATTR, this.PLAY_STATE_NONE);
      });
    } catch (error) {
      console.error(
        '[InlineVideoPlayer] Init error:',
        error,
        'for wrap:',
        wrap,
        'player container:',
        playerContainer
      );
    }
  }

  public destroy(): void {
    this.observer?.disconnect();
    this.videoInstances.forEach((instance) => {
      try {
        instance.player.destroy();
      } catch (err) {
        console.error('[InlineVideoPlayer] Error destroying player:', err);
      }
    });
    this.videoInstances.clear();
  }
}

// Load Plyr CSS
const plyrCSSLink = document.createElement('link');
plyrCSSLink.rel = 'stylesheet';
plyrCSSLink.href = 'https://cdn.jsdelivr.net/npm/plyr@3.7.8/dist/plyr.css';
document.head.appendChild(plyrCSSLink);

// Load Plyr JS
window.loadScript('https://cdn.jsdelivr.net/npm/plyr@3.7.8/dist/plyr.js', { name: 'plyr' });

// Initialize after Webflow is ready and Plyr is available
window.Webflow = window.Webflow || [];
window.Webflow.push(() => {
  const hasPlyr = !!window.Plyr;
  if (hasPlyr) {
    new InlineVideoPlayer();
  } else {
    document.addEventListener(
      'scriptLoaded:plyr',
      () => {
        new InlineVideoPlayer();
      },
      { once: true }
    );
  }
});
