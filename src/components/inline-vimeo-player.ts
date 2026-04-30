/**
 * Interview Video Player Component
 * Handles videos in .interviews_video-wrap elements using Plyr.io
 * - Lazy loads videos when they come into view
 * - Plays muted video on hover (only on desktop/non-touch devices)
 * - Plays video with audio on click/tap
 * - Thumbnail reappears when the video is not playing
 * - No custom player controls
 */

class InlineVimeoPlayer {
  private readonly VIDEO_WRAP_SELECTOR = '[data-inline-video], [data-video-el="vimeo"]';
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

  private initializeAll(): void {
    const videoWraps = document.querySelectorAll(this.VIDEO_WRAP_SELECTOR);

    if (videoWraps.length === 0) {
      window.IS_DEBUG_MODE && console.debug('[InlineVideoPlayer] No video wraps found');
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
    });

    window.IS_DEBUG_MODE &&
      console.debug('[InlineVideoPlayer] Observing', sectionMap.size, 'sections total');
  }

  private getLocalThumbnailUrl(wrap: HTMLElement): string | null {
    const thumbImg = wrap.querySelector<HTMLImageElement>('img');
    return thumbImg?.src || null;
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

    const videoUrl = wrap.getAttribute(this.VIDEO_URL_ATTR);

    if (!videoUrl) {
      console.warn('[InlineVideoPlayer] No video URL found for wrap:', wrap);
      return;
    }

    const isInterviewReel =
      wrap.getAttribute(this.INTERVIEW_VIDEO_ATTR) === this.INTERVIEW_VIDEO_ATTR_VALUE;
    const shouldLoop = wrap.getAttribute(this.VIDEO_LOOP_ATTR) === 'true';
    const shouldAutoplay = wrap.getAttribute(this.VIDEO_AUTOPLAY_ATTR) === 'true';

    const thumbnailUrl = this.getLocalThumbnailUrl(wrap);

    const canHover = !window.matchMedia('(pointer: coarse)').matches;

    // Create a container div for Plyr
    const playerContainer = document.createElement('div');
    playerContainer.setAttribute('data-plyr-provider', 'vimeo');
    playerContainer.setAttribute('data-plyr-embed-id', videoUrl);
    playerContainer.setAttribute('data-plyr-embed-hash', this.extractVimeoHash(videoUrl));
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
        autopause: !canHover,
        playsinline: true,
        vimeo: {
          speed: false,
          background: canHover,
          controls: shouldAutoplay ? false : !canHover,
          title: false,
          byline: false,
          portrait: false,
          transparent: true,
        },
        // Remove source since we're using data attributes
      });

      const videoInstance = { player, isClickPlaying: false, isHoverPlaying: false };
      this.videoInstances.set(wrap, videoInstance);

      player.on('ready', () => {
        if (!shouldAutoplay && canHover) {
          player.currentTime = 0;
          player.volume = 1;
        }
        wrap.setAttribute(this.PLAY_STATE_ATTR, this.PLAY_STATE_NONE);
      });

      if (isInterviewReel && canHover) {
        player.on('play', async () => {
          if (shouldAutoplay || videoInstance.isHoverPlaying) return;
          if (!videoInstance.isClickPlaying) {
            videoInstance.isClickPlaying = true;
            this.currentlyClickPlaying = wrap;
            wrap.setAttribute(this.PLAY_STATE_ATTR, this.PLAY_STATE_PLAYING);
          }
        });

        player.on('pause', () => {
          if (!videoInstance.isHoverPlaying) {
            videoInstance.isClickPlaying = false;
          }
        });

        wrap.addEventListener('click', () => {
          if (videoInstance.isClickPlaying) {
            this.pauseVideo(wrap); // No await
            return;
          }

          // Handle other playing videos synchronously
          if (this.currentlyClickPlaying && this.currentlyClickPlaying !== wrap) {
            const prevInstance = this.videoInstances.get(this.currentlyClickPlaying);
            if (prevInstance) {
              prevInstance.player.pause();
              prevInstance.isClickPlaying = false;
              this.currentlyClickPlaying.setAttribute(this.PLAY_STATE_ATTR, this.PLAY_STATE_PAUSED);
            }
          }

          // Play immediately (no await before this line)
          const playPromise = player.play();

          videoInstance.isClickPlaying = true;
          this.currentlyClickPlaying = wrap;
          wrap.setAttribute(this.PLAY_STATE_ATTR, this.PLAY_STATE_PLAYING);

          player.muted = false;
          player.volume = 1;

          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                // ONLY seek to 0 on desktop.
                // Seeking immediately after play resolves on iOS kills the audio track.
                if (canHover) {
                  player.currentTime = 0;
                }
              })
              .catch((error) => {
                console.error('Playback failed', error);
              });
          }
        });

        wrap.addEventListener('mouseenter', () => {
          if (videoInstance.isClickPlaying) return;
          videoInstance.isHoverPlaying = true;
          player.muted = true;
          player.play();
          wrap.setAttribute(this.PLAY_STATE_ATTR, this.PLAY_STATE_HOVER);
          window.IS_DEBUG_MODE &&
            console.debug('[InlineVideoPlayer] Hover play (muted):', videoUrl);
        });

        wrap.addEventListener('mouseleave', () => {
          if (videoInstance.isClickPlaying) return;
          videoInstance.isHoverPlaying = false;
          player.pause();
          wrap.setAttribute(this.PLAY_STATE_ATTR, this.PLAY_STATE_NONE);
          window.IS_DEBUG_MODE && console.debug('[InlineVideoPlayer] Hover pause:', videoUrl);
        });
      }

      player.on('ended', () => {
        videoInstance.isClickPlaying = false;
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
        wrap
      );
    }
  }

  private extractVimeoHash(url: string): string {
    try {
      const parsed = new URL(url);
      const parts = parsed.pathname.split('/').filter(Boolean);

      const [id, hash] = parts;

      if (!hash) return '';
      return hash;
    } catch {
      return url;
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
plyrCSSLink.href = 'https://cdn.jsdelivr.net/npm/plyr@3.7.8/dist/plyr.min.css';
document.head.appendChild(plyrCSSLink);

// Load Plyr JS
window.loadScript('https://cdn.jsdelivr.net/npm/plyr@3.7.8/dist/plyr.min.js', { name: 'plyr' });

// Initialize after Webflow is ready and Plyr is available
window.Webflow = window.Webflow || [];
window.Webflow.push(() => {
  const checkAndInit = () => {
    if (window.Plyr) {
      new InlineVimeoPlayer();
      return true;
    }
    return false;
  };

  if (!checkAndInit()) {
    document.addEventListener('scriptLoaded:plyr', () => checkAndInit(), { once: true });
  }
});
