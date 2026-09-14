import { listHighlights } from './highlights.web';
import {
  REEL_CLIPS,
  REEL_SECONDS_PER_CLIP,
  REEL_TITLE_SECONDS,
  reelFilename,
  type ReelOptions,
  type ReelResult,
} from './reelShared';

// From the shared module, never from './reel' — on this platform that name
// resolves to this file, and re-exporting through it is an infinite recursion.
export {
  REEL_CLIPS,
  REEL_SECONDS_PER_CLIP,
  REEL_TITLE_SECONDS,
  estimateReelSeconds,
  reelFilename,
  type ReelOptions,
  type ReelProgress,
  type ReelResult,
} from './reelShared';

/**
 * One video of the evening, cut from the clips.
 *
 * The clips cannot simply be glued together, and it is worth saying why, since
 * "concatenate the files" is the obvious thing to reach for. Each one is its own
 * recording with its own container header and its own timeline starting at
 * zero. Appending the bytes of two WebM files gives something a player will
 * show the first few seconds of and then stop; appending two MP4 files gives
 * something no player opens at all. Joining them properly means rewriting the
 * container — a remuxer, in an app that has no need of one anywhere else.
 *
 * So this re-records instead. Each clip is played into a hidden `<video>`, its
 * frames are drawn onto a canvas, and the canvas is captured by a single
 * `MediaRecorder` that runs from the first frame to the last. The result is one
 * genuine file the browser made itself, in whatever format it prefers — which
 * also means it plays anywhere the recorder's own clips play.
 *
 * The price is that it happens in real time: a reel is as long to make as it is
 * to watch, and the screen says so and counts down rather than showing a
 * spinner that could mean anything. That is also why a reel is eight clips of
 * three and a half seconds and not everything: half a minute of waiting for
 * something you share is fine, two minutes is not.
 */

export const REEL_SUPPORTED =
  typeof window !== 'undefined' &&
  typeof (window as { MediaRecorder?: unknown }).MediaRecorder !== 'undefined' &&
  typeof document !== 'undefined' &&
  typeof HTMLCanvasElement !== 'undefined' &&
  typeof HTMLCanvasElement.prototype.captureStream === 'function';

/** The reel is portrait, because every clip came off a phone held upright. */
const WIDTH = 720;
const HEIGHT = 1280;
const FPS = 30;

function pickMimeType(): string | undefined {
  const candidates = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  const Recorder = (window as unknown as { MediaRecorder: typeof MediaRecorder }).MediaRecorder;
  for (const type of candidates) {
    if (typeof Recorder.isTypeSupported === 'function' && Recorder.isTypeSupported(type)) {
      return type;
    }
  }
  return undefined;
}

/**
 * How long a clip runs.
 *
 * A `MediaRecorder` blob usually has no duration in its header — the recorder
 * does not know how long it will run until it stops, and never goes back to
 * write it down. Seeking past the end forces the browser to work it out, which
 * is the standard way round this and the reason for the absurd number.
 */
function durationOf(video: HTMLVideoElement): Promise<number> {
  return new Promise((resolve) => {
    if (Number.isFinite(video.duration) && video.duration > 0) {
      resolve(video.duration);
      return;
    }
    const done = () => {
      video.removeEventListener('seeked', done);
      resolve(Number.isFinite(video.duration) ? video.duration : 0);
    };
    video.addEventListener('seeked', done);
    try {
      video.currentTime = 1e101;
    } catch {
      done();
    }
    // Some browsers never fire it. A clip whose length cannot be found is
    // played from the start rather than skipped.
    setTimeout(done, 1200);
  });
}

function loadClip(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    // Attached, one pixel, off the side of the screen. A detached <video> is
    // allowed to decode nothing at all — which showed up as the first clip
    // never starting and the progress bar sitting on "clip 1" forever. It must
    // not be `display: none` either, for the same reason.
    video.style.cssText =
      'position:fixed;left:-10px;top:0;width:1px;height:1px;opacity:0.01;pointer-events:none';
    document.body.appendChild(video);
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => reject(new Error('clip will not load'));
    setTimeout(() => reject(new Error('clip took too long')), 8000);
  });
}

/**
 * Anything that might never answer, given a deadline.
 *
 * Every wait in here needs one. A reel is a loop over a handful of clips, and a
 * single promise that never settles is not a slow reel — it is a progress bar
 * that stops at clip one and stays there, which is exactly what `play()` on a
 * detached element did.
 */
function within<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise.catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

/** Draws a frame of video onto the canvas, letterboxed rather than stretched. */
function drawFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  label: string,
  index: number,
  total: number
): void {
  ctx.fillStyle = '#080A08';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const vw = video.videoWidth || WIDTH;
  const vh = video.videoHeight || HEIGHT;
  // Cover, not contain: a phone clip in a portrait frame with black bars down
  // both sides looks like a mistake, and the edges of a beer pong clip are
  // somebody's kitchen.
  const scale = Math.max(WIDTH / vw, HEIGHT / vh);
  const w = vw * scale;
  const h = vh * scale;
  ctx.drawImage(video, (WIDTH - w) / 2, (HEIGHT - h) / 2, w, h);

  // A strip along the bottom, so the clip number and time are readable over
  // whatever the footage happens to be.
  ctx.fillStyle = 'rgba(8,10,8,0.72)';
  ctx.fillRect(0, HEIGHT - 130, WIDTH, 130);
  ctx.fillStyle = '#39FF14';
  ctx.font = 'bold 46px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(`#${index} / ${total}`, 44, HEIGHT - 82);
  ctx.fillStyle = '#E8F2E4';
  ctx.font = '34px sans-serif';
  ctx.fillText(label, 44, HEIGHT - 36);
}

function drawTitle(
  ctx: CanvasRenderingContext2D,
  title: string,
  subtitle: string,
  progress: number
): void {
  ctx.fillStyle = '#080A08';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#39FF14';
  ctx.font = 'bold 92px sans-serif';
  ctx.fillText(title, WIDTH / 2, HEIGHT / 2 - 40);
  ctx.fillStyle = '#9BA79B';
  ctx.font = '40px sans-serif';
  ctx.fillText(subtitle, WIDTH / 2, HEIGHT / 2 + 50);
  // A line that fills as the card plays, so the first second and a half does
  // not read as the video being stuck.
  ctx.fillStyle = '#1E2A1C';
  ctx.fillRect(WIDTH / 2 - 160, HEIGHT / 2 + 130, 320, 8);
  ctx.fillStyle = '#39FF14';
  ctx.fillRect(WIDTH / 2 - 160, HEIGHT / 2 + 130, 320 * progress, 8);
  ctx.textAlign = 'left';
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function buildReel(options: ReelOptions): Promise<ReelResult | null> {
  if (!REEL_SUPPORTED) return null;
  const clips = (await listHighlights()).slice(0, REEL_CLIPS);
  if (clips.length === 0) return null;
  // Oldest first: a reel of an evening should run forwards.
  const ordered = [...clips].sort((a, b) => a.at - b.at);

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const mimeType = pickMimeType();
  const stream = canvas.captureStream(FPS);
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  } catch {
    return null;
  }
  const parts: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) parts.push(event.data);
  };
  const finished = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });
  recorder.start(1000);

  const total = ordered.length;
  // The title card is a step of its own for the progress bar, but not a clip —
  // reporting it as one had the last clip of three announcing itself as "clip 4
  // of 3". `step` moves the bar, `clip` is what the screen says.
  const steps = total + 1;
  const report = (step: number, clip: number, within: number) =>
    options.onProgress?.({
      done: Math.min(1, (step - 1 + within) / steps),
      clip: Math.min(clip, total),
      of: total,
    });

  // The card at the front.
  const titleStart = performance.now();
  while (performance.now() - titleStart < REEL_TITLE_SECONDS * 1000) {
    const share = (performance.now() - titleStart) / (REEL_TITLE_SECONDS * 1000);
    drawTitle(ctx, options.title, options.subtitle, share);
    report(1, 1, share);
    await wait(1000 / FPS);
  }

  let index = 0;
  for (const clip of ordered) {
    index += 1;
    let video: HTMLVideoElement | null = null;
    try {
      video = await loadClip(clip.url);
      const length = await durationOf(video);
      // The last few seconds, where the cup actually goes down.
      const from = Math.max(0, length - REEL_SECONDS_PER_CLIP);
      video.currentTime = from;
      await new Promise<void>((resolve) => {
        const go = () => {
          video?.removeEventListener('seeked', go);
          resolve();
        };
        video?.addEventListener('seeked', go);
        setTimeout(go, 800);
      });
      await within(video.play(), 1500);

      const when = new Date(clip.at);
      const label = `${String(when.getHours()).padStart(2, '0')}:${String(
        when.getMinutes()
      ).padStart(2, '0')}`;
      const started = performance.now();
      const runFor = REEL_SECONDS_PER_CLIP * 1000;
      while (performance.now() - started < runFor) {
        drawFrame(ctx, video, label, index, total);
        report(index + 1, index, (performance.now() - started) / runFor);
        await wait(1000 / FPS);
      }
      video.pause();
    } catch {
      // A clip that will not open is skipped rather than taking the reel with
      // it. One broken recording out of twelve is not a reason to lose the
      // other eleven.
    } finally {
      if (video) {
        video.removeAttribute('src');
        video.load();
        video.remove();
      }
    }
  }

  recorder.stop();
  await finished;
  stream.getTracks().forEach((track) => track.stop());

  const blob = new Blob(parts, { type: recorder.mimeType || mimeType || 'video/webm' });
  if (blob.size === 0) return null;
  const type = recorder.mimeType || mimeType || 'video/webm';
  options.onProgress?.({ done: 1, clip: total, of: total });
  return {
    url: URL.createObjectURL(blob),
    mimeType: type,
    seconds: Math.round(REEL_TITLE_SECONDS + total * REEL_SECONDS_PER_CLIP),
    size: blob.size,
    filename: reelFilename(new Date(), type),
  };
}
