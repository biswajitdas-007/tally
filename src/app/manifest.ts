import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tally — Split expenses & settle up",
    short_name: "Tally",
    description:
      "Split bills with friends, track balances, and settle up instantly over UPI.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0c110e",
    theme_color: "#0c110e",
    categories: ["finance", "productivity", "utilities"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Add expense", short_name: "Add", url: "/?action=add" },
      { name: "Settle up", short_name: "Settle", url: "/?action=settle" },
      { name: "Analytics", short_name: "Insights", url: "/analytics" },
    ],
  };
}
