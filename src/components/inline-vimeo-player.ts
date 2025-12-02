/**
 * Interview Video Player Component
 * Handles Vimeo videos in .interviews_video-wrap elements
 * - Lazy loads videos when they come into view
 * - Plays muted video on hover
 * - Plays video with audio on click
 */
import type { VimeoUrl } from '@vimeo/player';

class InlineVimeoPlayer {
  private readonly VIDEO_WRAP_SELECTOR = '[data-interview-video-el]';
  private readonly VIDEO_URL_ATTR = 'data-video-url';

  private readonly PLAY_STATE_ATTR = 'data-play-state';
  private readonly PLAY_STATE_HOVER = 'hover';
  private readonly PLAY_STATE_PLAYING = 'playing';
  private readonly PLAY_STATE_PAUSED = 'paused';
  private readonly PLAY_STATE_NONE = 'none';

  private observer: IntersectionObserver;
  private videoInstances: Map<HTMLElement, any> = new Map();
  private currentlyPlaying: HTMLElement | null = null;

  constructor() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.initializeVideo(entry.target as HTMLElement);
          }
        });
      },
      {
        rootMargin: '500px', // Start loading when x px away from viewport
        threshold: 0,
      }
    );

    this.initializeAll();
  }

  private initializeAll(): void {
    const videoWraps = document.querySelectorAll(this.VIDEO_WRAP_SELECTOR);

    if (videoWraps.length === 0) {
      console.debug('[InlineVimeoPlayer] No video wraps found');
      return;
    }

    videoWraps.forEach((wrap) => {
      this.observer.observe(wrap);
    });

    window.IS_DEBUG_MODE &&
      console.debug('[InlineVimeoPlayer] Observing', videoWraps.length, 'video wraps');
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

  private async initializeVideo(wrap: HTMLElement): Promise<void> {
    // Stop observing once we start initializing
    this.observer.unobserve(wrap);

    // Check if already initialized
    if (this.videoInstances.has(wrap)) {
      return;
    }

    const videoUrl = wrap.getAttribute(this.VIDEO_URL_ATTR);
    if (!videoUrl) {
      console.error('[InlineVimeoPlayer] No video URL found on wrap', wrap);
      return;
    }

    // Fetch and apply thumbnail before initializing player
    const thumbnailUrl = await this.fetchThumbnail(videoUrl);
    wrap.style.setProperty('--thumb', `url('${thumbnailUrl}')`);

    // Check if Vimeo API is available
    if (!window.Vimeo?.Player) {
      console.error('[InlineVimeoPlayer] Vimeo API not available');
      return;
    }

    try {
      // Create player as frameless (background) video
      const player = new window.Vimeo.Player(wrap, {
        url: videoUrl as VimeoUrl,
        background: true, // Frameless video without controls
        muted: true,
        autoplay: true,
        loop: true,
      });

      await player.ready();
      await player.setCurrentTime(1); // Load first frame
      await player.pause(); // Ensure paused initially

      this.videoInstances.set(wrap, player);

      // Track playing states
      let isClickPlaying = false;

      // Pause function
      const pauseVideo = async () => {
        if (!isClickPlaying) return;
        isClickPlaying = false;
        this.currentlyPlaying = null;
        wrap.setAttribute(this.PLAY_STATE_ATTR, this.PLAY_STATE_PAUSED);
        await player.pause();
      };

      // Store pause function for cross-instance calls
      this.videoInstances.set(wrap, { player, pauseVideo });

      // Hover handlers
      wrap.addEventListener('mouseenter', async () => {
        // Don't interfere if already playing with audio
        if (isClickPlaying) return;

        try {
          await player.setMuted(true);
          await player.play();
          wrap.setAttribute(this.PLAY_STATE_ATTR, this.PLAY_STATE_HOVER);
        } catch (err) {
          console.error('[InlineVimeoPlayer] Error playing on hover:', err);
        }
      });

      wrap.addEventListener('mouseleave', async () => {
        // Don't interfere if playing with audio from click or already paused
        if (isClickPlaying || (await player.getPaused())) return;

        wrap.setAttribute(this.PLAY_STATE_ATTR, this.PLAY_STATE_NONE);
        try {
          await player.pause();
        } catch (err) {
          console.error('[InlineVimeoPlayer] Error pausing on hover leave:', err);
        }
      });

      // Click handler
      wrap.addEventListener('click', async () => {
        if (isClickPlaying) {
          await pauseVideo();
        } else {
          // Pause any other currently playing video
          if (this.currentlyPlaying && this.currentlyPlaying !== wrap) {
            const instance = this.videoInstances.get(this.currentlyPlaying);
            if (instance?.pauseVideo) {
              await instance.pauseVideo();
            }
          }

          // Start playing with audio
          isClickPlaying = true;
          this.currentlyPlaying = wrap;

          try {
            wrap.setAttribute(this.PLAY_STATE_ATTR, this.PLAY_STATE_PLAYING);
            await player.setMuted(false);
            await player.setVolume(1);
            await player.play();
          } catch (err) {
            console.error('[InlineVimeoPlayer] Error playing on click:', err);
            isClickPlaying = false;
            this.currentlyPlaying = null;
          }
        }
      });

      // Listen for video ending to reset state
      player.on('ended', () => {
        isClickPlaying = false;
        if (this.currentlyPlaying === wrap) {
          this.currentlyPlaying = null;
        }
        wrap.setAttribute(this.PLAY_STATE_ATTR, this.PLAY_STATE_NONE);
      });

      window.IS_DEBUG_MODE && console.debug('[InlineVimeoPlayer] Player initialized for', videoUrl);
    } catch (error) {
      console.error('[InlineVimeoPlayer] Error initializing video:', error);
    }
  }

  public destroy(): void {
    this.observer.disconnect();
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
