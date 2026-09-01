/**
 * Universal Screen Wake Lock / Keep-Alive Utility
 *
 * Keeps mobile devices (iOS Safari, Android Chrome/Samsung) and Desktop displays
 * awake during an active quiz session using a silent, hidden HTML5 video loop.
 *
 * This implementation avoids any calls to `navigator.wakeLock.request('screen')`,
 * completely preventing `NotAllowedError: A permissions policy does not allow screen-wake-lock`
 * in sandboxed iframes and webview environments.
 */

// 1-pixel transparent dummy video clips encoded in base64
const WEBM_VIDEO_DATA =
  "data:video/webm;base64,GkXfo0AgQoaBAUL3gQFC8oEEQvOBCEKCQAR3ZWJtQoeBAkKFgQIYU4BnQI0VSalmQCgq17FAAwICMTdeBAEAAAAAABqHQwEAAAAAAAAnEIEBAAAAAAAAP1WBQAAAAAAAAA2AQAAAAAAAAA=";

const MP4_VIDEO_DATA =
  "data:video/mp4;base64,AAAAHGZ0eXBtcDQyAAAAAG1wNDJpc29tYXZjMQAAAAhmcmVlAAAAGG1kYXRl4AAQAAAAAAAHAAAAAgAAACxtb292AAAAbG12aGQAAAAA1uN6pNbjeqQAAP+AAAAAAAEAAAEAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAHIdHJhazAAAAx0a2hkAAAABNbieqTW43qkAAAAAQAAAAAAA+gAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAB1bWRpYQAAACBtZGhkAAAAANbieqTW43qkAAA+gAAP6AAAAC1oZGxyAAAAAAAAAAB2aWRlAAAAAAAAAAAAAAAAVmlkZW9IYW5kbGVyAAAAARhtYmluAAAADG1pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAOFzdGJsAAAAmHN0c2QAAAAAAAAAAQAAAGhhdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAHgAeABIAAAASAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGP//AAAALWF2Y0MBQsAN/+EAFWdCwA3ZAsTsBEAAAPpAADqYA8UKkgEABWjLg8sgAAAAHHV1aWRraEDyXyRPxbo5pRvPAyPzAAAAAAAAABhzdHRzAAAAAAAAAAEAAAABAAA+gAAAAFRzdHNjAAAAAAAAABsAAAABAAAAAQAAAAEAAAACAAAAAgAAAAEAAAADAAAAAQAAAAEAAAAEAAAAAgAAAAEAAAAGAAAAAQAAAAEAAAAHAAAAAgAAAAEAAAAIAAAAAQAAAAEAAAAJAAAAAgAAAAEAAAAKAAAAAQAAAAEAAAALAAAAAgAAAAEAAAANAAAAAQAAAAEAAAAOAAAAAgAAAAEAAAAPAAAAAQAAAAEAAAAQAAAAAgAAAAEAAAARAAAAAQAAAAEAAAASAAAAAgAAAAEAAAAUAAAAAQAAAAEAAAAVAAAAAgAAAAEAAAAWAAAAAQAAAAEAAAAXAAAAAgAAAAEAAAAIAAAAAQAAAAEAAAAZAAAAAgAAAAEAAAAaAAAAAQAAAAEAAAAbAAAAAgAAAAEAAAAdAAAAAQAAAAEAAAAeAAAAAgAAAAEAAAAfAAAABAAAAAEAAABgc3RzegAAAAAAAAAAAAAAAQAAAAMAAACMc3RjbwAAAAAAAAAfAAAALAAAA1UAAANyAAADhgAAA6IAAAO+AAAD0QAAA+0AAAQAAAAEHAAABC8AAARLAAAEZwAABHoAAASWAAAEqQAABMUAAATYAAAE9AAABRAAAAUjAAAFPwAABVIAAAVuAAAFgQAABZ0AAAWwAAAFzAAABegAAAX7AAAGFwAAAA==";

class UniversalScreenWakeLock {
  private videoEl: HTMLVideoElement | null = null;
  private isEnabled: boolean = false;
  private listeners: Set<(active: boolean) => void> = new Set();
  private gestureAttached: boolean = false;

  private getOrCreateVideo(): HTMLVideoElement | null {
    if (typeof document === "undefined") return null;
    if (this.videoEl) return this.videoEl;

    try {
      const video = document.createElement("video");
      video.setAttribute("muted", "true");
      video.setAttribute("playsinline", "true");
      video.setAttribute("webkit-playsinline", "true");
      video.setAttribute("loop", "true");
      video.muted = true;
      video.playsInline = true;
      video.loop = true;
      video.autoplay = true;

      // Make element completely invisible and unobtrusive
      video.style.position = "absolute";
      video.style.top = "-9999px";
      video.style.left = "-9999px";
      video.style.width = "1px";
      video.style.height = "1px";
      video.style.opacity = "0.001";
      video.style.pointerEvents = "none";
      video.style.zIndex = "-1000";

      const sourceWebm = document.createElement("source");
      sourceWebm.src = WEBM_VIDEO_DATA;
      sourceWebm.type = "video/webm";
      video.appendChild(sourceWebm);

      const sourceMp4 = document.createElement("source");
      sourceMp4.src = MP4_VIDEO_DATA;
      sourceMp4.type = "video/mp4";
      video.appendChild(sourceMp4);

      // Add dummy play event listeners
      video.addEventListener("ended", () => {
        if (this.isEnabled) {
          video.play().catch(() => {});
        }
      });

      document.body.appendChild(video);
      this.videoEl = video;
      return video;
    } catch {
      return null;
    }
  }

  public subscribe(callback: (active: boolean) => void): () => void {
    this.listeners.add(callback);
    callback(this.isActive());
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    const active = this.isActive();
    this.listeners.forEach((cb) => {
      try {
        cb(active);
      } catch {
        // Safe callback execution
      }
    });
  }

  public isActive(): boolean {
    return this.isEnabled;
  }

  public async enable(): Promise<boolean> {
    this.isEnabled = true;
    const video = this.getOrCreateVideo();

    if (video) {
      try {
        video.currentTime = 0;
        await video.play();
      } catch {
        // Will be resumed on first user touch / click
      }
    }

    if (!this.gestureAttached && typeof window !== "undefined") {
      this.gestureAttached = true;
      const resumeVideo = () => {
        if (this.isEnabled && this.videoEl && this.videoEl.paused) {
          this.videoEl.play().catch(() => {});
          this.notify();
        }
      };

      window.addEventListener("touchstart", resumeVideo, { passive: true });
      window.addEventListener("click", resumeVideo, { passive: true });
      window.addEventListener("pointerdown", resumeVideo, { passive: true });
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && this.isEnabled) {
          resumeVideo();
        }
      });
    }

    this.notify();
    return true;
  }

  public disable(): void {
    this.isEnabled = false;
    if (this.videoEl) {
      try {
        this.videoEl.pause();
      } catch {
        // Safe pause
      }
    }
    this.notify();
  }

  public toggle(): boolean {
    if (this.isEnabled) {
      this.disable();
      return false;
    } else {
      this.enable().catch(() => {});
      return true;
    }
  }
}

export const screenWakeLock = new UniversalScreenWakeLock();
