/**
 * Interview Video Player Component
 * Handles Vimeo videos in .interviews_video-wrap elements
 * - Lazy loads videos when they come into view
 * - Plays muted video on hover
 * - Plays video with audio on click
 */

class InterviewVideoPlayer {
  private readonly VIDEO_WRAP_SELECTOR = '[data-interview-video-el]';
  private readonly VIDEO_URL_ATTR = 'data-video-url';
  private readonly CLASS_HOVER_PLAYING = 'is-hover-playing';
  private readonly CLASS_CLICK_PLAYING = 'is-click-playing';
  private readonly CLASS_CLICK_PAUSED = 'is-click-paused';

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
        rootMargin: '500px', // Start loading when 200px away from viewport
        threshold: 0,
      }
    );

    this.initializeAll();
  }

  private initializeAll(): void {
    const videoWraps = document.querySelectorAll(this.VIDEO_WRAP_SELECTOR);

    if (videoWraps.length === 0) {
      console.debug('[InterviewVideo] No video wraps found');
      return;
    }

    videoWraps.forEach((wrap) => {
      this.observer.observe(wrap);
    });

    window.IS_DEBUG_MODE &&
      console.debug('[InterviewVideo] Observing', videoWraps.length, 'video wraps');
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
      console.error('[InterviewVideo] No video URL found on wrap', wrap);
      return;
    }

    // Check if Vimeo API is available
    const VimeoGlobal: any = (window as any).Vimeo;
    if (!VimeoGlobal || !VimeoGlobal.Player) {
      console.error('[InterviewVideo] Vimeo API not available');
      return;
    }

    try {
      // Create player as frameless (background) video
      const player: any = new VimeoGlobal.Player(wrap, {
        url: videoUrl,
        background: true, // Frameless video without controls
        muted: true,
        autoplay: false,
        loop: true,
      });

      await player.ready();
      await player.pause(); // Ensure paused initially
      this.videoInstances.set(wrap, player);

      // Track playing states
      let isClickPlaying = false;

      // Pause function
      const pauseVideo = async () => {
        if (!isClickPlaying) return;
        isClickPlaying = false;
        this.currentlyPlaying = null;
        wrap.classList.remove(this.CLASS_CLICK_PLAYING);
        wrap.classList.add(this.CLASS_CLICK_PAUSED);
        await player.pause();
      };

      // Store pause function for cross-instance calls
      this.videoInstances.set(wrap, { player, pauseVideo });

      // Hover handlers
      wrap.addEventListener('mouseenter', async () => {
        // Don't interfere if already playing with audio
        if (isClickPlaying) return;

        wrap.classList.remove(this.CLASS_CLICK_PAUSED);
        wrap.classList.add(this.CLASS_HOVER_PLAYING);
        try {
          await player.setMuted(true);
          await player.play();
        } catch (err) {
          console.error('[InterviewVideo] Error playing on hover:', err);
          wrap.classList.remove(this.CLASS_HOVER_PLAYING);
        }
      });

      wrap.addEventListener('mouseleave', async () => {
        // Don't interfere if playing with audio from click
        if (isClickPlaying) return;

        wrap.classList.remove(this.CLASS_HOVER_PLAYING);
        try {
          await player.pause();
        } catch (err) {
          console.error('[InterviewVideo] Error pausing on hover leave:', err);
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
          wrap.classList.remove(this.CLASS_HOVER_PLAYING);
          wrap.classList.remove(this.CLASS_CLICK_PAUSED);
          wrap.classList.add(this.CLASS_CLICK_PLAYING);

          try {
            await player.setMuted(false);
            await player.setVolume(1);
            await player.play();
          } catch (err) {
            console.error('[InterviewVideo] Error playing on click:', err);
            isClickPlaying = false;
            this.currentlyPlaying = null;
            wrap.classList.remove(this.CLASS_CLICK_PLAYING);
          }
        }
      });

      // Listen for video ending to reset state
      player.on('ended', () => {
        isClickPlaying = false;
        if (this.currentlyPlaying === wrap) {
          this.currentlyPlaying = null;
        }
        wrap.classList.remove(this.CLASS_CLICK_PLAYING);
        wrap.classList.remove(this.CLASS_CLICK_PAUSED);
      });

      window.IS_DEBUG_MODE && console.debug('[InterviewVideo] Player initialized for', videoUrl);
    } catch (error) {
      console.error('[InterviewVideo] Error initializing video:', error);
    }
  }

  public destroy(): void {
    this.observer.disconnect();
    this.videoInstances.forEach((player) => {
      try {
        player.destroy();
      } catch (err) {
        console.error('[InterviewVideo] Error destroying player:', err);
      }
    });
    this.videoInstances.clear();
  }
}

window.loadScript('https://player.vimeo.com/api/player.js', { name: 'vimeo-sdk' });

// Initialize after Webflow is ready and Vimeo API is available
window.Webflow = window.Webflow || [];
window.Webflow.push(() => {
  const hasVimeo = !!(window as any).Vimeo?.Player;
  if (hasVimeo) {
    new InterviewVideoPlayer();
  } else {
    document.addEventListener(
      'scriptLoaded:vimeo-sdk',
      () => {
        new InterviewVideoPlayer();
      },
      { once: true }
    );
  }
});
