import { useEffect, useRef } from "react";

// Limita el bucle a ~16 fps (suficiente para ASCII y evita saturar la CPU).
const INTERVALO_MS = 60;

/**
 * Gestiona la webcam mientras `active` sea true: pide la cámara, reproduce el
 * vídeo en un elemento oculto y, en un bucle de animación, llama a
 * `onFrame(video)` con cada fotograma. Al desactivarse libera la cámara.
 *
 * @param {boolean} active
 * @param {(video: HTMLVideoElement) => void} onFrame
 * @param {(error: unknown) => void} [onError]
 * @returns {import("react").RefObject<HTMLVideoElement>} ref para el <video> oculto.
 */
export function useWebcam(active, onFrame, onError) {
  const videoRef = useRef(null);
  const onFrameRef = useRef(onFrame);
  const onErrorRef = useRef(onError);
  onFrameRef.current = onFrame;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!active) return;

    let raf;
    let stream;
    let cancelado = false;
    let ultimo = 0;
    const video = videoRef.current;

    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((s) => {
        if (cancelado) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        video.srcObject = s;
        return video.play();
      })
      .then(() => {
        const loop = (ts) => {
          if (cancelado) return;
          if (video.videoWidth && ts - ultimo > INTERVALO_MS) {
            ultimo = ts;
            onFrameRef.current(video);
          }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      })
      .catch((err) => {
        if (!cancelado) onErrorRef.current?.(err);
      });

    return () => {
      cancelado = true;
      if (raf) cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (video) video.srcObject = null;
    };
  }, [active]);

  return videoRef;
}
