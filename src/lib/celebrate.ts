import type { CreateTypes } from "canvas-confetti";

let cannon: Promise<CreateTypes> | undefined;

/**
 * canvas-confetti's default cannon draws in a blob: worker, which our CSP
 * (`worker-src 'self'`) blocks — and the browser blocks it asynchronously, so
 * the library never falls back and nothing appears. Ours draws on the main
 * thread instead; a two-second burst doesn't need a worker.
 */
function getCannon(): Promise<CreateTypes> {
  // The promise is cached, not the cannon, so two quick calls still share one.
  cannon ??= import("canvas-confetti").then(({ default: confetti }) =>
    confetti.create(undefined, { resize: true, useWorker: false }),
  );
  return cannon;
}

/** A tasteful brand-coloured confetti burst — used when a settle-up completes. */
export async function celebrate() {
  if (typeof window === "undefined") return;
  const confetti = await getCannon();
  // The logo's tally strokes plus the magenta tick.
  const colors = ["#e3165b", "#5b3ff0", "#0b8fe0", "#12a16b", "#ffb020"];
  confetti({
    particleCount: 90,
    spread: 78,
    startVelocity: 42,
    origin: { y: 0.62 },
    colors,
    disableForReducedMotion: true,
  });
  setTimeout(() => {
    confetti({
      particleCount: 55,
      spread: 110,
      decay: 0.92,
      scalar: 0.9,
      origin: { y: 0.6 },
      colors,
      disableForReducedMotion: true,
    });
  }, 160);
}
