"use client";

import type { RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  buildLiveSignal,
  type PpgSample,
  readPpgSample,
} from "@/features/pulse/lib/ppgSampler";

export type SamplingStatus = "idle" | "sampling" | "stopped" | "error";

type UsePulseFrameSamplerOptions = {
  stream: MediaStream | null;
  videoRef: RefObject<HTMLVideoElement | null>;
};

const SAMPLE_INTERVAL_MS = 40;
const MAX_STORED_SAMPLES = 600;

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Video frames could not be sampled.";
}

export function usePulseFrameSampler({
  stream,
  videoRef,
}: UsePulseFrameSamplerOptions) {
  const [samples, setSamples] = useState<PpgSample[]>([]);
  const [liveSignal, setLiveSignal] = useState<number[]>([]);
  const [status, setStatus] = useState<SamplingStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const samplesRef = useRef<PpgSample[]>([]);
  const timerRef = useRef<number | null>(null);
  const statusRef = useRef<SamplingStatus>("idle");

  const clearSamplingTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopSampling = useCallback(() => {
    clearSamplingTimer();
    setStatus((currentStatus) =>
      currentStatus === "idle" ? "idle" : "stopped",
    );
  }, [clearSamplingTimer]);

  const resetSamples = useCallback(() => {
    samplesRef.current = [];
    setSamples([]);
    setLiveSignal([]);
    setError(null);
    setStatus((currentStatus) =>
      currentStatus === "sampling" ? "sampling" : "idle",
    );
  }, []);

  const captureSample = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      clearSamplingTimer();
      setError("Video preview is unavailable.");
      setStatus("error");
      return;
    }

    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }

    try {
      const sample = readPpgSample(video, canvasRef.current);
      if (!sample) {
        return;
      }

      const nextSamples = [...samplesRef.current, sample].slice(
        -MAX_STORED_SAMPLES,
      );
      samplesRef.current = nextSamples;
      setSamples(nextSamples);
      setLiveSignal(buildLiveSignal(nextSamples));
    } catch (samplingError) {
      clearSamplingTimer();
      setError(getErrorMessage(samplingError));
      setStatus("error");
    }
  }, [clearSamplingTimer, videoRef]);

  const startSampling = useCallback(() => {
    if (!stream) {
      setError("Start the camera before starting the signal.");
      setStatus("error");
      return;
    }

    if (!videoRef.current) {
      setError("Video preview is unavailable.");
      setStatus("error");
      return;
    }

    clearSamplingTimer();
    setError(null);
    setStatus("sampling");
    captureSample();
    timerRef.current = window.setInterval(captureSample, SAMPLE_INTERVAL_MS);
  }, [captureSample, clearSamplingTimer, stream, videoRef]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    if (!stream && statusRef.current === "sampling") {
      stopSampling();
    }
  }, [stopSampling, stream]);

  useEffect(() => {
    return () => {
      clearSamplingTimer();
    };
  }, [clearSamplingTimer]);

  return {
    samples,
    liveSignal,
    status,
    error,
    startSampling,
    stopSampling,
    resetSamples,
  };
}

