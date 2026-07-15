/** A tasteful brand-coloured confetti burst — used when a settle-up completes. */
export async function celebrate() {
  if (typeof window === "undefined") return;
  const confetti = (await import("canvas-confetti")).default;
  const colors = ["#1c6b52", "#45b18b", "#a9793a", "#e0b467", "#12996b"];
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
