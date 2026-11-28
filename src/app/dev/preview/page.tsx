import type { Metadata } from "next";
import { PreviewControls } from "./preview-controls";

export const metadata: Metadata = { title: "Preview", robots: { index: false } };

/**
 * Dev-only switch for the sample-data preview session. In production the proxy
 * answers every /dev/* request with a 404 before this page is reached.
 */
export default function PreviewPage() {
  return <PreviewControls />;
}
