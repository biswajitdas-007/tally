"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function UpiQR({ value, size = 176 }: { value: string; size?: number }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      margin: 0,
      width: size * 2,
      errorCorrectionLevel: "M",
      color: { dark: "#15201a", light: "#ffffff" },
    })
      .then((d) => active && setUrl(d))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [value, size]);

  if (!url) return <div className="skeleton rounded-xl" style={{ width: size, height: size }} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} width={size} height={size} alt="UPI payment QR code" className="rounded-lg" />;
}
