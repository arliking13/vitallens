"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus = "idle" | "requesting" | "ready" | "denied" | "error";
export type TorchState = "unsupported" | "off" | "on" | "failed";

type TorchMediaTrackCapabilities = MediaTrackCapabilities & {
  torch?: boolean;
};

type TorchMediaTrackConstraintSet = MediaTrackConstraintSet & {
  torch?: boolean;
};

function stopMediaStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => {
    track.stop();
  });
}

function getErrorName(error: unknown) {
  if (typeof error === "object" && error !== null && "name" in error) {
    return String(error.name);
  }

  return "UnknownError";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Camera access could not be started.";
}

function isPermissionDenied(error: unknown) {
  const name = getErrorName(error);
  return (
    name === "NotAllowedError" ||
    name === "PermissionDeniedError" ||
    name === "SecurityError"
  );
}

async function requestTorch(stream: MediaStream): Promise<TorchState> {
  const [videoTrack] = stream.getVideoTracks();

  if (!videoTrack?.getCapabilities || !videoTrack.applyConstraints) {
    return "unsupported";
  }

  const capabilities = videoTrack.getCapabilities() as TorchMediaTrackCapabilities;
  if (!capabilities.torch) {
    return "unsupported";
  }

  try {
    await videoTrack.applyConstraints({
      advanced: [{ torch: true } as TorchMediaTrackConstraintSet],
    });
    return "on";
  } catch {
    return "failed";
  }
}

export function useRearCamera() {
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [torchState, setTorchState] = useState<TorchState>("unsupported");

  const requestIdRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef(true);

  const stopCamera = useCallback(() => {
    requestIdRef.current += 1;
    stopMediaStream(streamRef.current);
    streamRef.current = null;

    setStream(null);
    setStatus("idle");
    setError(null);
    setTorchState((currentTorchState) =>
      currentTorchState === "unsupported" ? "unsupported" : "off",
    );
  }, []);

  const startCamera = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    stopMediaStream(streamRef.current);
    streamRef.current = null;

    setStream(null);
    setError(null);
    setTorchState("unsupported");
    setStatus("requesting");

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError(
        "UnsupportedError — Camera access is unavailable. Please allow camera access in Safari settings and reload the page.",
      );
      console.error("[pulse-camera] getUserMedia failed", {
        message:
          "Camera access is unavailable. Please allow camera access in Safari settings and reload the page.",
        name: "UnsupportedError",
      });
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });

      if (!isMountedRef.current || requestIdRef.current !== requestId) {
        stopMediaStream(mediaStream);
        return;
      }

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setStatus("ready");

      const nextTorchState = await requestTorch(mediaStream);
      if (isMountedRef.current && requestIdRef.current === requestId) {
        setTorchState(nextTorchState);
      }
    } catch (cameraError) {
      if (!isMountedRef.current || requestIdRef.current !== requestId) {
        return;
      }

      const errorName = getErrorName(cameraError);
      const errorMessage = getErrorMessage(cameraError);

      console.error("[pulse-camera] getUserMedia failed", cameraError);

      setStream(null);
      setTorchState("unsupported");
      setError(`${errorName} — ${errorMessage}`);
      setStatus(isPermissionDenied(cameraError) ? "denied" : "error");
    }
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      requestIdRef.current += 1;
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    };
  }, []);

  return {
    status,
    stream,
    error,
    torchState,
    startCamera,
    stopCamera,
  };
}
