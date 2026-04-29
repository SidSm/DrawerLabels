"use client";
import { useEffect, useRef } from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";

interface Props {
  onDecode: (text: string) => void;
  onError?: (err: Error) => void;
}

async function pickDeviceId(): Promise<string | undefined> {
  let tmp: MediaStream | null = null;
  try {
    tmp = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
    });
  } catch {
    tmp = await navigator.mediaDevices.getUserMedia({ video: true });
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  tmp.getTracks().forEach((t) => t.stop());
  const cams = devices.filter((d) => d.kind === "videoinput");
  const back = cams.find((d) => /back|rear|environment/i.test(d.label));
  return (back ?? cams[0])?.deviceId;
}

export default function QrScanner({ onDecode, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const onDecodeRef = useRef(onDecode);
  const onErrorRef = useRef(onError);

  useEffect(() => { onDecodeRef.current = onDecode; }, [onDecode]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let cancelled = false;

    (async () => {
      try {
        if (!window.isSecureContext) {
          throw new Error("Camera requires HTTPS (or localhost).");
        }
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera API not supported in this browser.");
        }
        const deviceId = await pickDeviceId();
        if (!videoRef.current || cancelled) return;
        const controls = await reader.decodeFromVideoDevice(
          deviceId,
          videoRef.current,
          (result) => {
            if (result) onDecodeRef.current(result.getText());
          },
        );
        if (cancelled) controls.stop();
        else controlsRef.current = controls;
      } catch (e) {
        const err = e as Error;
        if (err.name === "NotAllowedError") {
          onErrorRef.current?.(new Error("Camera permission denied."));
        } else if (err.name === "NotFoundError") {
          onErrorRef.current?.(new Error("No camera found."));
        } else {
          onErrorRef.current?.(err);
        }
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, []);

  return (
    <video
      ref={videoRef}
      style={{ width: "100%", maxWidth: 480, borderRadius: 8, background: "#000" }}
      muted
      playsInline
      autoPlay
    />
  );
}
