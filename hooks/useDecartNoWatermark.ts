'use client';

import { useRef, useEffect, useCallback } from 'react';

interface Props {
  decartStream: MediaStream | null;
  enabled: boolean; // true = active le retrait du watermark
  onCleanStreamReady?: (cleanStream: MediaStream) => void;
}

export function useDecartNoWatermark({ decartStream, enabled, onCleanStreamReady }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cleanStreamRef = useRef<MediaStream | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const enabledRef = useRef(enabled);

  // On garde une ref toujours a jour de `enabled` pour que la boucle RAF en
  // cours puisse lire la valeur courante sans avoir besoin d'etre relancee.
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Copie le flux Decart
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (enabledRef.current) {
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
    }

    rafIdRef.current = requestAnimationFrame(processFrame);
  }, []);

  const stopLoop = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  const stopCleanStream = useCallback(() => {
    if (cleanStreamRef.current) {
      cleanStreamRef.current.getTracks().forEach((track) => track.stop());
      cleanStreamRef.current = null;
    }
  }, []);

  // Connexion du flux
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !decartStream) {
      return;
    }

    video.srcObject = decartStream;
    video.muted = true;
    video.playsInline = true;

    const handleLoadedMetadata = () => {
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      // Stoppe toute boucle precedente avant d'en demarrer une nouvelle,
      // pour eviter d'accumuler plusieurs RAF en parallele.
      stopLoop();

      // Cree (ou recree) le flux propre. On le recree systematiquement ici
      // car decartStream a change (nouvelle reference), donc l'ancien
      // cleanStream pointe potentiellement vers un canvas dont le contenu
      // ne correspond plus au nouveau flux source.
      stopCleanStream();
      cleanStreamRef.current = canvas.captureStream(30);
      onCleanStreamReady?.(cleanStreamRef.current);

      rafIdRef.current = requestAnimationFrame(processFrame);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.play().catch(() => {
      // Lecture bloquee par le navigateur (autoplay policy) : on retente
      // silencieusement, la video est muted donc generalement autorisee.
    });

    // Si les metadonnees sont deja disponibles (flux deja actif), on
    // declenche manuellement car l'evenement ne sera pas re-emis.
    if (video.readyState >= 1 && video.videoWidth > 0) {
      handleLoadedMetadata();
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      stopLoop();
      video.srcObject = null;
    };
  }, [decartStream, processFrame, onCleanStreamReady, stopLoop, stopCleanStream]);

  // Nettoyage complet au demontage du composant
  useEffect(() => {
    return () => {
      stopLoop();
      stopCleanStream();
    };
  }, [stopLoop, stopCleanStream]);

  return { videoRef, canvasRef };
}
