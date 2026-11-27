import type { Metadata } from "next";
import { PreviewControls } from "./preview-controls";

export const metadata: Metadata = { title: "Preview", robots: { index: false } };

/**
 * Dev-only switch for the sample-data preview session. The `.dev.tsx` page
 * extension only exists under `next dev` (see next.config.ts), so production
 * builds have no such route at all.
 */
export default function PreviewPage() {
  return <PreviewControls />;
}
