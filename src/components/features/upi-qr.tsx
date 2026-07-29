"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { qrBitmap } from "@/lib/qr";
import { formatINR } from "@/lib/utils";

/** Whether this browser can put a file into the share sheet. Read through
 *  useSyncExternalStore so the server renders the "no" branch and the client
 *  agrees on the first paint. Never changes, so it never needs to notify. */
const noop = () => () => {};
let fileShare: boolean | undefined;
function supportsFileShare(): boolean {
  fileShare ??=
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [new File(["x"], "probe.png", { type: "image/png" })] });
  return fileShare;
}

/**
 * A UPI QR, drawn on a canvas so it can be saved to the photo library or shared
 * as a real image file.
 *
 * Always black on white, in both themes — scanners want the contrast that way
 * round, and an inverted QR is a QR that doesn't scan.
 */
export function UpiQr({
  uri,
  amount,
  payeeName,
  fileLabel,
}: Readonly<{
  uri: string;
  amount: number;
  payeeName: string;
  /** Goes in the saved file's name, so a photo roll full of these stays sortable. */
  fileLabel: string;
}>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canShareFile = useSyncExternalStore(noop, supportsFileShare, () => false);
  const { toast } = useToast();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Scale to the device so it stays crisp, but cap it — past ~3x the file is
    // bigger with nothing more to read.
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const { px, rgba } = qrBitmap(uri, 280 * dpr);

    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext("2d");
    ctx?.putImageData(new ImageData(rgba, px, px), 0, 0);
  }, [uri]);

  function toBlob(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve(null);
      canvas.toBlob(resolve, "image/png");
    });
  }

  const fileName = `tally-upi-${fileLabel}-${Math.round(amount)}.png`;

  async function save() {
    const blob = await toBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast({ message: "QR saved" });
  }

  async function share() {
    const blob = await toBlob();
    if (!blob) return;
    const file = new File([blob], fileName, { type: "image/png" });
    try {
      await navigator.share({
        files: [file],
        text: `${formatINR(amount)} to ${payeeName} — scan to pay`,
      });
    } catch {
      // Dismissing the share sheet throws; nothing to report.
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="mx-auto w-full max-w-[240px] rounded-[14px] bg-white p-3 shadow-[var(--shadow-xs)]">
        <canvas ref={canvasRef} className="block h-auto w-full" aria-label={`UPI QR code for ${formatINR(amount)} to ${payeeName}`} />
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="md" fullWidth onClick={save}>
          <Download className="h-4 w-4" /> Save
        </Button>
        {canShareFile && (
          <Button variant="secondary" size="md" fullWidth onClick={share}>
            <Share2 className="h-4 w-4" /> Share
          </Button>
        )}
      </div>
    </div>
  );
}
