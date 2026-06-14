'use client';

import { useRef, useEffect, useCallback } from 'react';

interface Props {
  decartStream: MediaStream | null;
  enabled: boolean;           // true = active le retrait du watermark
  onCleanStreamReady?: (cleanStream: MediaStream) => void;
}

export function useDecartNoWatermark({ decartStream, enabled, onCleanStreamReady }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cleanStreamRef = useRef<MediaStream | null>(null);

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    
    // Copie le flux Decart
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (!enabled) {
      requestAnimationFrame(processFrame);
      return;
    }

    const w = canvas.width;
    const h = canvas.height;

    // Zones larges pour couvrir le watermark mobile
    const zones = [
      { x: w * 0.55, y: h * 0.72, w: w * 0.45, h: h * 0.28 },
      { x: 0, y: h * 0.72, w: w * 0.45, h: h * 0.28 },
      { x: w * 0.55, y: 10, w: w * 0.45, h: h * 0.25 },
      { x: w * 0.25, y: h * 0.68, w: w * 0.5, h: h * 0.32 },
      { x: w * 0.65, y: h * 0.35, w: w * 0.35, h: h * 0.3 },
    ];

    zones.forEach((zone) => {
      // Clone des pixels voisins
      ctx.drawImage(
        canvas,
        zone.x - zone.w * 0.7,
        zone.y - 40,
        zone.w * 1.6,
        zone.h * 1.3,
        zone.x,
        zone.y,
        zone.w,
        zone.h
      );

      // Blur puissant pour masquer le texte
      ctx.save();
      ctx.filter = 'blur(5px)';
      ctx.drawImage(
        canvas,
        zone.x - 20,
        zone.y - 20,
        zone.w + 40,
        zone.h + 40,
        zone.x - 10,
        zone.y - 10,
        zone.w + 20,
        zone.h + 20
      );
      ctx.filter = 'none';
      ctx.restore();
    });

    requestAnimationFrame(processFrame);
  }, [enabled]);

  // Connexion du flux
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !decartStream) return;

    video.srcObject = decartStream;
    video.play().catch(console.error);

    video.onloadedmetadata = () => {
      const canvas = canvasRef.current!;
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      if (!cleanStreamRef.current) {
        cleanStreamRef.current = canvas.captureStream(30);
        onCleanStreamReady?.(cleanStreamRef.current);
      }

      processFrame();
    };

    return () => {
      if (video.srcObject) {
        video.srcObject = null;
      }
    };
  }, [decartStream, processFrame, onCleanStreamReady]);

  return { videoRef, canvasRef, cleanStream: cleanStreamRef.current };
}
