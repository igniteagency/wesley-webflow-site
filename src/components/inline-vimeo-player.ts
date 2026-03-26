/**
 * Interview Video Player Component
 * Handles Vimeo videos in .interviews_video-wrap elements
 * - Lazy loads videos when they come into view
 * - Plays muted video on hover
 * - Plays video with audio on click
 */
import type { VimeoUrl } from '@vimeo/player';

class InlineVimeoPlayer {
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
  private currentlyPlaying: HTMLElement | null = null;

  constructor() {
    this.observer = null;
    this.initializeAll();
  }

  private initializeAll(): void {
    const videoWraps = document.querySelectorAll(this.VIDEO_WRAP_SELECTOR);

    if (videoWraps.length === 0) {
      console.debug('[InlineVimeoPlayer] No video wraps found');
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
        console.debug(`[InlineVimeoPlayer] Observing section with ${videos.length} videos`);
    });

    window.IS_DEBUG_MODE &&
      console.debug('[InlineVimeoPlayer] Observing', sectionMap.size, 'sections total');
  }

  private async fetchThumbnail(videoUrl: string): Promise<string | null> {
    try {
      const response = await fetch(
        `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(videoUrl)}&height=1920`
      );

      if (!response.ok) {
        window.IS_DEBUG_MODE &&
          console.error(
            `[InlineVimeoPlayer] Failed to fetch thumbnail for the video: ${videoUrl}`,
            response.statusText
          );
        return null;
      }

      const data = await response.json();
      return data.thumbnail_url || null;
    } catch (error) {
      console.error('[InlineVimeoPlayer] Error fetching thumbnail:', error);
      return null;
    }
  }
  private async pauseVideo(wrap: HTMLElement): Promise<void> {
    const instance = this.videoInstances.get(wrap);
    const player = instance?.player;
    const videoUrl = wrap.getAttribute(this.VIDEO_URL_ATTR);

    if (!player) {
      console.warn('[InlineVimeoPlayer] No player instance found for wrap:', wrap);
      return;
    }

    await player.pause();
    instance.isClickPlaying = false;
    wrap.setAttribute(this.PLAY_STATE_ATTR, this.PLAY_STATE_PAUSED);
    window.IS_DEBUG_MODE && console.debug('[InlineVimeoPlayer] Paused video:', videoUrl);

    if (this.currentlyPlaying === wrap) {
      this.currentlyPlaying = null;
    }
  }

  private async initializeVideo(wrap: HTMLElement): Promise<void> {
    if (this.videoInstances.has(wrap)) return;

    const videoUrl = wrap.getAttribute(this.VIDEO_URL_ATTR);
    const isInterviewReel =
      wrap.getAttribute(this.INTERVIEW_VIDEO_ATTR) === this.INTERVIEW_VIDEO_ATTR_VALUE;
    const shouldLoop = wrap.getAttribute(this.VIDEO_LOOP_ATTR) === 'true';
    const shouldAutoplay = wrap.getAttribute(this.VIDEO_AUTOPLAY_ATTR) === 'true';

    const thumbnailUrl = await this.fetchThumbnail(videoUrl!);
    wrap.style.setProperty('--thumb', `url('${thumbnailUrl}')`);

    const canHover = !window.matchMedia('(pointer: coarse)').matches;

    try {
      const player = new window.Vimeo.Player(wrap, {
        url: videoUrl as VimeoUrl,
        background: canHover, // Background videos on desktop to allow parallel video playing on hover
        controls: false,
        muted: canHover ? true : shouldAutoplay, // Start muted if autoplay is enabled
        autoplay: shouldAutoplay,
        loop: shouldLoop,
        playsinline: true,
      });

      // SAVE THE OBJECT IMMEDIATELY (Don't set it twice)
      this.videoInstances.set(wrap, { player, isClickPlaying: false });

      player.ready().then(() => {
        if (!shouldAutoplay) {
          player.setCurrentTime(1);
          if (canHover) player.setVolume(1);
        }
        wrap.setAttribute(this.PLAY_STATE_ATTR, this.PLAY_STATE_NONE);
      });

      if (isInterviewReel) {
        const videoInstance = this.videoInstances.get(wrap);

        // CLICK HANDLER (Mobile + Desktop)
        wrap.addEventListener('click', async () => {
          if (videoInstance.isClickPlaying) {
            await this.pauseVideo(wrap);
            return;
          }

          // Save reference to previously playing video before updating
          const previouslyPlaying = this.currentlyPlaying;

          videoInstance.isClickPlaying = true;
          this.currentlyPlaying = wrap;
          wrap.setAttribute(this.PLAY_STATE_ATTR, this.PLAY_STATE_PLAYING);

          if (canHover) {
            player.setMuted(false);
            player.setVolume(1);
          }

          const playPromise = player.play();

          // NOW it's safe to await — iOS already received the play postMessage above
          if (previouslyPlaying && previouslyPlaying !== wrap) {
            await this.pauseVideo(previouslyPlaying);
          }

          try {
            await playPromise;
            await player.setCurrentTime(0);

            window.IS_DEBUG_MODE &&
              console.debug('[InlineVimeoPlayer] Playing video with sound:', videoUrl);
          } catch (err) {
            console.error('[InlineVimeoPlayer] Play failed:', err);
            videoInstance.isClickPlaying = false;
            this.currentlyPlaying = null;
            wrap.setAttribute(this.PLAY_STATE_ATTR, this.PLAY_STATE_NONE);
          }
        });

        // HOVER HANDLER (Desktop Only)
        if (canHover) {
          wrap.addEventListener('mouseenter', () => {
            if (videoInstance.isClickPlaying) return;
            player.setMuted(true);
            player.play();
            wrap.setAttribute(this.PLAY_STATE_ATTR, this.PLAY_STATE_HOVER);
            window.IS_DEBUG_MODE &&
              console.debug('[InlineVimeoPlayer] Hover play (muted):', videoUrl);
          });

          wrap.addEventListener('mouseleave', () => {
            if (videoInstance.isClickPlaying) return;
            player.pause();
            wrap.setAttribute(this.PLAY_STATE_ATTR, this.PLAY_STATE_NONE);
            window.IS_DEBUG_MODE && console.debug('[InlineVimeoPlayer] Hover pause:', videoUrl);
          });
        }
      }

      player.on('ended', () => {
        this.videoInstances.get(wrap).isClickPlaying = false;
        if (this.currentlyPlaying === wrap) this.currentlyPlaying = null;
        wrap.setAttribute(this.PLAY_STATE_ATTR, this.PLAY_STATE_NONE);
      });
    } catch (error) {
      console.error('[InlineVimeoPlayer] Init error:', error);
    }
  }

  public destroy(): void {
    this.observer?.disconnect();
    this.videoInstances.forEach((player) => {
      try {
        player.destroy();
      } catch (err) {
        console.error('[InlineVimeoPlayer] Error destroying player:', err);
      }
    });
    this.videoInstances.clear();
  }
}

window.loadScript('https://player.vimeo.com/api/player.js', { name: 'vimeo-sdk' });

// Initialize after Webflow is ready and Vimeo API is available
window.Webflow = window.Webflow || [];
window.Webflow.push(() => {
  const hasVimeo = !!window.Vimeo?.Player;
  if (hasVimeo) {
    new InlineVimeoPlayer();
  } else {
    document.addEventListener(
      'scriptLoaded:vimeo-sdk',
      () => {
        new InlineVimeoPlayer();
      },
      { once: true }
    );
  }
});
