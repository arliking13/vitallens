"use client";

import type { RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  evaluateFingerGate,
  type FingerGateState,
  getFingerGateMessage,
} from "@/features/pulse/lib/fingerGate";
import { movingAverage } from "@/features/pulse/lib/ppgFilters";
import {
  analyzePulseSignalQuality,
  type PulseSignalQuality,
} from "@/features/pulse/lib/pulseQuality";
import {
  estimatePulseFromSamples,
  type PulseEstimate,
} from "@/features/pulse/lib/pulseEstimator";
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
const SMOOTHING_WINDOW_SIZE = 5;
const TRANSITION_TRIM_MS = 750;
const initialQuality = analyzePulseSignalQuality([]);
const initialPulseEstimate = estimatePulseFromSamples({
  fingerDetected: initialQuality.fingerDetected,
  samples: [],
  signalQuality: initialQuality.signalQuality,
});

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `ppg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getSampleDurationMs(samples: PpgSample[]) {
  if (samples.length < 2) {
    return 0;
  }

  return Math.max(0, samples[samples.length - 1].t - samples[0].t);
}

function getSampleWindowStartedAt(samples: PpgSample[]) {
  return samples[0]?.t ?? null;
}

function trimRecentSamples(samples: PpgSample[], trimAfterMs: number) {
  return samples.filter((sample) => sample.t < trimAfterMs);
}

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
  const [smoothedSignal, setSmoothedSignal] = useState<number[]>([]);
  const [signalQuality, setSignalQuality] = useState<PulseSignalQuality>(
    initialQuality.signalQuality,
  );
  const [fingerDetected, setFingerDetected] = useState(
    initialQuality.fingerDetected,
  );
  const [qualityMessage, setQualityMessage] = useState(
    initialQuality.qualityMessage,
  );
  const [pulseEstimate, setPulseEstimate] =
    useState<PulseEstimate>(initialPulseEstimate);
  const [sessionId, setSessionId] = useState(createSessionId);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [fingerGateState, setFingerGateState] =
    useState<FingerGateState>("waiting-for-finger");
  const [ignoredFrameCount, setIgnoredFrameCount] = useState(0);
  const [fingerLostCount, setFingerLostCount] = useState(0);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(
    null,
  );
  const [lastFingerLostAt, setLastFingerLostAt] = useState<number | null>(null);
  const [status, setStatus] = useState<SamplingStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const samplesRef = useRef<PpgSample[]>([]);
  const timerRef = useRef<number | null>(null);
  const statusRef = useRef<SamplingStatus>("idle");
  const previousFrameRef = useRef<PpgSample | null>(null);
  const fingerGateStateRef = useRef<FingerGateState>("waiting-for-finger");
  const stabilizationStartedAtRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);

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
    const nextQuality = analyzePulseSignalQuality([]);
    samplesRef.current = [];
    setSamples([]);
    setLiveSignal([]);
    setSmoothedSignal([]);
    setSignalQuality(nextQuality.signalQuality);
    setFingerDetected(nextQuality.fingerDetected);
    setQualityMessage(nextQuality.qualityMessage);
    setPulseEstimate(
      estimatePulseFromSamples({
        fingerDetected: nextQuality.fingerDetected,
        samples: [],
        signalQuality: nextQuality.signalQuality,
      }),
    );
    setSessionId(createSessionId());
    setStartedAt(null);
    setDurationMs(0);
    setFingerGateState("waiting-for-finger");
    setIgnoredFrameCount(0);
    setFingerLostCount(0);
    setRecordingStartedAt(null);
    setLastFingerLostAt(null);
    previousFrameRef.current = null;
    fingerGateStateRef.current = "waiting-for-finger";
    stabilizationStartedAtRef.current = null;
    recordingStartedAtRef.current = null;
    setError(null);
    setStatus((currentStatus) =>
      currentStatus === "sampling" ? "sampling" : "idle",
    );
  }, []);

  const resetMeasurementWindow = useCallback((sample: PpgSample) => {
    const nextQuality = analyzePulseSignalQuality([]);
    samplesRef.current = [];
    setSamples([]);
    setLiveSignal([]);
    setSmoothedSignal([]);
    setSignalQuality(nextQuality.signalQuality);
    setFingerDetected(nextQuality.fingerDetected);
    setQualityMessage("Restarting clean signal window");
    setPulseEstimate(
      estimatePulseFromSamples({
        fingerDetected: nextQuality.fingerDetected,
        samples: [],
        signalQuality: nextQuality.signalQuality,
      }),
    );
    setSessionId(createSessionId());
    setStartedAt(new Date().toISOString());
    setDurationMs(0);
    setRecordingStartedAt(null);
    recordingStartedAtRef.current = null;
    stabilizationStartedAtRef.current = sample.t;
  }, []);

  const updateRecordedSamples = useCallback((nextSamples: PpgSample[]) => {
    samplesRef.current = nextSamples;
    const nextRecordingStartedAt = getSampleWindowStartedAt(nextSamples);
    const nextLiveSignal = buildLiveSignal(nextSamples);
    const nextSmoothedSignal = movingAverage(
      nextLiveSignal,
      SMOOTHING_WINDOW_SIZE,
    );
    const nextQuality = analyzePulseSignalQuality(nextSamples);
    const nextPulseEstimate = estimatePulseFromSamples({
      fingerDetected: nextQuality.fingerDetected,
      normalizedSignal: nextLiveSignal,
      samples: nextSamples,
      signalQuality: nextQuality.signalQuality,
    });

    setSamples(nextSamples);
    setLiveSignal(nextLiveSignal);
    setSmoothedSignal(nextSmoothedSignal);
    setSignalQuality(nextQuality.signalQuality);
    setFingerDetected(nextQuality.fingerDetected);
    setQualityMessage(nextQuality.qualityMessage);
    setPulseEstimate(nextPulseEstimate);
    setRecordingStartedAt(nextRecordingStartedAt);
    recordingStartedAtRef.current = nextRecordingStartedAt;
    setDurationMs(getSampleDurationMs(nextSamples));
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

      const gateDecision = evaluateFingerGate({
        previousSample: previousFrameRef.current,
        sample,
        stabilizationStartedAt: stabilizationStartedAtRef.current,
        state: fingerGateStateRef.current,
      });
      const previousGateState = fingerGateStateRef.current;
      previousFrameRef.current = sample;
      fingerGateStateRef.current = gateDecision.nextState;
      stabilizationStartedAtRef.current = gateDecision.stabilizationStartedAt;
      setFingerGateState(gateDecision.nextState);

      if (gateDecision.shouldResetSession) {
        resetMeasurementWindow(sample);
      }

      if (
        gateDecision.shouldTrimRecentSamples &&
        samplesRef.current.length > 0
      ) {
        const trimmedSamples = trimRecentSamples(
          samplesRef.current,
          sample.t - TRANSITION_TRIM_MS,
        );
        updateRecordedSamples(trimmedSamples);
        setFingerLostCount((count) => count + 1);
        setLastFingerLostAt(sample.t);
        setQualityMessage("Place your finger back over the camera");
      }

      if (!gateDecision.shouldRecord) {
        setIgnoredFrameCount((count) => count + 1);
        setFingerDetected(gateDecision.covered);
        if (gateDecision.shouldResetSession) {
          setQualityMessage("Restarting clean signal window");
        } else if (!gateDecision.shouldTrimRecentSamples) {
          setQualityMessage(getFingerGateMessage(gateDecision.nextState));
        }
        return;
      }

      if (recordingStartedAtRef.current === null) {
        recordingStartedAtRef.current = sample.t;
        setRecordingStartedAt(sample.t);
        if (previousGateState !== "recording") {
          setStartedAt(new Date().toISOString());
        }
      }

      const nextSamples = [...samplesRef.current, sample].slice(
        -MAX_STORED_SAMPLES,
      );
      updateRecordedSamples(nextSamples);
    } catch (samplingError) {
      clearSamplingTimer();
      setError(getErrorMessage(samplingError));
      setStatus("error");
    }
  }, [
    clearSamplingTimer,
    resetMeasurementWindow,
    updateRecordedSamples,
    videoRef,
  ]);

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
    if (samplesRef.current.length === 0) {
      setSessionId(createSessionId());
      setStartedAt(new Date().toISOString());
      setDurationMs(0);
      setFingerGateState("waiting-for-finger");
      setRecordingStartedAt(null);
      fingerGateStateRef.current = "waiting-for-finger";
      stabilizationStartedAtRef.current = null;
      recordingStartedAtRef.current = null;
    }
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
    smoothedSignal,
    signalQuality,
    fingerDetected,
    qualityMessage,
    pulseEstimate,
    sessionId,
    startedAt,
    durationMs,
    fingerGateState,
    cleanWindowStartedAt: recordingStartedAt,
    cleanWindowDurationMs: durationMs,
    currentWindowValidSampleCount: samples.length,
    totalIgnoredFrameCount: ignoredFrameCount,
    totalFingerLostCount: fingerLostCount,
    recordingStartedAt,
    lastFingerLostAt,
    status,
    error,
    startSampling,
    stopSampling,
    resetSamples,
  };
}
