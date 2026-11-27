/** A tasteful brand-coloured confetti burst — used when a settle-up completes. */
export async function celebrate() {
  if (typeof window === "undefined") return;
  const confetti = (await import("canvas-confetti")).default;
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
