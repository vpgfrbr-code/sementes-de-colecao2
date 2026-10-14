"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface PixQrCodeProps {
  brCode: string;
  size?: number;
}

export function PixQrCode({ brCode, size = 220 }: PixQrCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !brCode) return;
    QRCode.toCanvas(canvasRef.current, brCode, {
      width: size,
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });
  }, [brCode, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="block"
      aria-label="PIX QR Code"
    />
  );
}
