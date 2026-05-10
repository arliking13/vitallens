"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/shared/components/Button";
import { Card } from "@/shared/components/Card";
import { InfoRow } from "@/shared/components/InfoRow";
import { ScreenHeader } from "@/shared/components/ScreenHeader";
import { SignalPreview } from "@/shared/components/SignalPreview";
import type { BreathMotionResult } from "@/shared/types/check-flow";

type BreathCheckScreenProps = {
  onBack: () => void;
  onNext: () => void;
  onResult: (result: BreathMotionResult | null) => void;
};

type BreathPhase = "idle" | "recording" | "complete" | "unavailable";

type BreathMotionSample = {
  t: number;
  value: number;
};

type DeviceMotionEventConstructorWithPermission =
  typeof DeviceMotionEvent & {
    requestPermission?: () => Promise<PermissionState>;
  };

type WebAudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

const RECORDING_DURATION_SECONDS = 30;
const RECORDING_DURATION_MS = RECORDING_DURATION_SECONDS * 1000;
const START_GUIDE_DELAY_MS = 4300;
const HALFWAY_GUIDE_MS = 15000;
const ALMOST_DONE_GUIDE_MS = 26000;

const fallbackMessage =
  "Motion access unavailable. You can continue with pulse-only report.";

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const mean = average(values);
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    values.length;

  return Math.sqrt(variance);
}

function getRange(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return Math.max(...values) - Math.min(...values);
}

function getMotionMagnitude(event: DeviceMotionEvent) {
  const acceleration = event.accelerationIncludingGravity ?? event.acceleration;

  if (!acceleration) {
    return null;
  }

  const x = acceleration.x;
  const y = acceleration.y;
  const z = acceleration.z;
  const hasMotionValue =
    typeof x === "number" || typeof y === "number" || typeof z === "number";

  if (!hasMotionValue) {
    return null;
  }

  return Math.hypot(x ?? 0, y ?? 0, z ?? 0);
}

function buildPreviewSignal(samples: BreathMotionSample[]) {
  const values = samples.slice(-48).map((sample) => sample.value);
  const range = getRange(values);

  if (values.length < 2 || range <= 0.0001) {
    return undefined;
  }

  const min = Math.min(...values);
  return values.map((value) => (value - min) / range);
}

function buildBucketedMotion(samples: BreathMotionSample[]) {
  if (samples.length === 0) {
    return [];
  }

  const startedAt = samples[0].t;
  const buckets = new Map<number, number[]>();

  samples.forEach((sample) => {
    const bucketIndex = Math.floor((sample.t - startedAt) / 1000);
    const bucketValues = buckets.get(bucketIndex) ?? [];
    bucketValues.push(sample.value);
    buckets.set(bucketIndex, bucketValues);
  });

  return Array.from(buckets.entries())
    .sort(([leftIndex], [rightIndex]) => leftIndex - rightIndex)
    .map(([, values]) => average(values));
}

function analyzeBreathMotion(
  samples: BreathMotionSample[],
  durationMs: number,
): BreathMotionResult {
  const durationSeconds = Math.round(durationMs / 1000);
  const sampleCount = samples.length;
  const bucketedMotion = buildBucketedMotion(samples);

  if (sampleCount < 20 || durationSeconds < 10 || bucketedMotion.length < 6) {
    return {
      durationSeconds,
      motionDetected: false,
      qualityLabel: "Low",
      rhythmLabel: "Not enough motion",
      sampleCount,
    };
  }

  const motionRange = getRange(bucketedMotion);
  const motionSpread = standardDeviation(bucketedMotion);
  const motionDetected = motionRange >= 0.015 || motionSpread >= 0.006;

  if (!motionDetected) {
    return {
      durationSeconds,
      motionDetected: false,
      qualityLabel: "Low",
      rhythmLabel: "Not enough motion",
      sampleCount,
    };
  }

  const bucketDeltas = bucketedMotion
    .slice(1)
    .map((value, index) => Math.abs(value - bucketedMotion[index]));
  const averageDelta = average(bucketDeltas);
  const deltaVariation = standardDeviation(bucketDeltas);
  const consistencyRatio =
    averageDelta > 0 ? deltaVariation / averageDelta : Number.POSITIVE_INFINITY;
  const rhythmLabel = consistencyRatio <= 1.35 ? "Steady" : "Uneven";
  const qualityLabel =
    sampleCount >= 80 && durationSeconds >= 25
      ? rhythmLabel === "Steady"
        ? "Good"
        : "Fair"
      : "Fair";

  return {
    durationSeconds,
    motionDetected,
    qualityLabel,
    rhythmLabel,
    sampleCount,
  };
}

async function requestDeviceMotionAccess() {
  if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) {
    return "unsupported" as const;
  }

  const MotionEventConstructor = window
    .DeviceMotionEvent as DeviceMotionEventConstructorWithPermission;

  if (typeof MotionEventConstructor.requestPermission === "function") {
    try {
      const permission = await MotionEventConstructor.requestPermission();
      return permission === "granted" ? "granted" : "denied";
    } catch {
      return "denied";
    }
  }

  return "granted" as const;
}

function getHeaderDescription(phase: BreathPhase) {
  if (phase === "recording") {
    return "Keep the phone still and breathe normally. Audio will guide the check.";
  }

  if (phase === "complete") {
    return "Your wellness-only motion summary is ready.";
  }

  if (phase === "unavailable") {
    return fallbackMessage;
  }

  return "Place your iPhone on your upper abdomen or chest. Audio will guide you through the check.";
}

function getPreviewStatus(phase: BreathPhase) {
  if (phase === "recording") {
    return "Listening";
  }

  if (phase === "complete") {
    return "Complete";
  }

  if (phase === "unavailable") {
    return "Unavailable";
  }

  return "Ready";
}

function getPrimaryButtonLabel(phase: BreathPhase) {
  if (phase === "recording") {
    return "Stop breath check";
  }

  if (phase === "complete") {
    return "Run again";
  }

  return "Start guided breath check";
}

function getMotionAccessLabel(phase: BreathPhase) {
  if (phase === "recording") {
    return "Listening";
  }

  if (phase === "complete") {
    return "Complete";
  }

  if (phase === "unavailable") {
    return "Unavailable";
  }

  return "Ready";
}

export function BreathCheckScreen({
  onBack,
  onNext,
  onResult,
}: BreathCheckScreenProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [motionSignal, setMotionSignal] = useState<number[] | undefined>();
  const [phase, setPhase] = useState<BreathPhase>("idle");
  const [result, setResult] = useState<BreathMotionResult | null>(null);
  const [sampleCount, setSampleCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const lastPreviewUpdateRef = useRef(0);
  const motionHandlerRef = useRef<((event: DeviceMotionEvent) => void) | null>(
    null,
  );
  const recordingStartedAtRef = useRef<number | null>(null);
  const samplesRef = useRef<BreathMotionSample[]>([]);
  const timersRef = useRef<number[]>([]);

  function clearTimers() {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];

    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function stopMotionListener() {
    if (motionHandlerRef.current) {
      window.removeEventListener("devicemotion", motionHandlerRef.current);
      motionHandlerRef.current = null;
    }
  }

  function prepareAudio() {
    if (typeof window === "undefined") {
      return;
    }

    const AudioContextConstructor =
      window.AudioContext ?? (window as WebAudioWindow).webkitAudioContext;

    if (!audioContextRef.current && AudioContextConstructor) {
      audioContextRef.current = new AudioContextConstructor();
    }

    void audioContextRef.current?.resume();
  }

  function playChime(frequency = 660) {
    prepareAudio();

    const context = audioContextRef.current;
    if (!context) {
      return;
    }

    const startedAt = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, startedAt);
    gain.gain.setValueAtTime(0.0001, startedAt);
    gain.gain.exponentialRampToValueAtTime(0.08, startedAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startedAt + 0.18);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startedAt);
    oscillator.stop(startedAt + 0.2);
  }

  function speak(message: string) {
    if (
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      "SpeechSynthesisUtterance" in window
    ) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 0.94;
      utterance.pitch = 1;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
      return;
    }

    playChime();
  }

  function speakSequence(messages: string[]) {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    messages.forEach((message) => speak(message));
  }

  function completeRecording() {
    if (!isRunningRef.current) {
      return;
    }

    isRunningRef.current = false;
    clearTimers();
    stopMotionListener();

    const startedAt = recordingStartedAtRef.current;
    const durationMs =
      startedAt === null
        ? 0
        : Math.min(RECORDING_DURATION_MS, performance.now() - startedAt);
    const nextResult = analyzeBreathMotion(samplesRef.current, durationMs);
    const nextSignal = buildPreviewSignal(samplesRef.current);

    setElapsedSeconds(nextResult.durationSeconds);
    setMotionSignal(nextSignal);
    setPhase("complete");
    setResult(nextResult);
    setSampleCount(nextResult.sampleCount);
    setStatusMessage(null);
    onResult(nextResult);
    speakSequence(["Breath check complete. You can pick up your phone."]);
  }

  function startMotionCollection() {
    if (!isRunningRef.current) {
      return;
    }

    recordingStartedAtRef.current = performance.now();
    speak("Recording started.");

    const handleMotion = (event: DeviceMotionEvent) => {
      const value = getMotionMagnitude(event);

      if (value === null) {
        return;
      }

      const capturedAt = performance.now();
      samplesRef.current.push({
        t: capturedAt,
        value,
      });

      if (capturedAt - lastPreviewUpdateRef.current >= 250) {
        lastPreviewUpdateRef.current = capturedAt;
        setSampleCount(samplesRef.current.length);
        const nextSignal = buildPreviewSignal(samplesRef.current);
        if (nextSignal) {
          setMotionSignal(nextSignal);
        }
      }
    };

    motionHandlerRef.current = handleMotion;
    window.addEventListener("devicemotion", handleMotion);

    intervalRef.current = window.setInterval(() => {
      const startedAt = recordingStartedAtRef.current;
      if (startedAt === null) {
        return;
      }

      const nextElapsedSeconds = Math.min(
        RECORDING_DURATION_SECONDS,
        (performance.now() - startedAt) / 1000,
      );
      setElapsedSeconds(nextElapsedSeconds);
      setSampleCount(samplesRef.current.length);

      if (nextElapsedSeconds >= RECORDING_DURATION_SECONDS) {
        completeRecording();
      }
    }, 250);

    timersRef.current.push(
      window.setTimeout(() => speak("Halfway there."), HALFWAY_GUIDE_MS),
      window.setTimeout(() => speak("Almost done."), ALMOST_DONE_GUIDE_MS),
    );
  }

  async function startGuidedCheck() {
    clearTimers();
    stopMotionListener();
    samplesRef.current = [];
    recordingStartedAtRef.current = null;
    lastPreviewUpdateRef.current = 0;
    isRunningRef.current = true;
    onResult(null);
    setElapsedSeconds(0);
    setMotionSignal(undefined);
    setPhase("recording");
    setResult(null);
    setSampleCount(0);
    setStatusMessage(null);
    prepareAudio();
    speakSequence([
      "Place your iPhone on your upper abdomen or chest.",
      "Keep it still and breathe normally.",
      "Starting in three, two, one.",
    ]);

    const motionAccess = await requestDeviceMotionAccess();

    if (!isRunningRef.current) {
      return;
    }

    if (motionAccess !== "granted") {
      isRunningRef.current = false;
      clearTimers();
      stopMotionListener();
      setPhase("unavailable");
      setStatusMessage(fallbackMessage);
      setElapsedSeconds(0);
      setSampleCount(0);
      setMotionSignal(undefined);
      onResult(null);
      speakSequence([fallbackMessage]);
      return;
    }

    timersRef.current.push(
      window.setTimeout(startMotionCollection, START_GUIDE_DELAY_MS),
    );
  }

  function handlePrimaryAction() {
    if (phase === "recording") {
      completeRecording();
      return;
    }

    void startGuidedCheck();
  }

  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      timersRef.current = [];

      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }

      if (motionHandlerRef.current) {
        window.removeEventListener("devicemotion", motionHandlerRef.current);
      }

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

      void audioContextRef.current?.close();
    };
  }, []);

  const progressPercent = Math.min(
    100,
    (elapsedSeconds / RECORDING_DURATION_SECONDS) * 100,
  );
  const roundedElapsedSeconds = Math.round(elapsedSeconds);
  const sampleLabel = result
    ? `${result.durationSeconds}s`
    : `${roundedElapsedSeconds}s / ${RECORDING_DURATION_SECONDS}s`;
  const canContinue = phase === "complete" || phase === "unavailable";
  const signalLabel = result?.motionDetected ? "Detected" : "Low";

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col pb-32">
      <ScreenHeader
        description={getHeaderDescription(phase)}
        title="Breath motion check"
      />

      <div className="mt-6">
        <SignalPreview
          caption={
            phase === "recording"
              ? "Motion signal preview"
              : "Guided motion check"
          }
          delayMs={40}
          label="Breath motion"
          liveSignal={motionSignal}
          status={getPreviewStatus(phase)}
          tone="breath"
        />
      </div>

      <Card className="mt-4" delayMs={80} padding="sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[var(--vl-text)]">
              Audio guidance on
            </p>
            <p className="mt-1 text-sm leading-5 text-[var(--vl-text-muted)]">
              Voice guidance plays during the check. Soft chimes are used if
              voice is unavailable.
            </p>
          </div>
          <span className="vl-peach-pill shrink-0 px-3 py-1 text-xs font-bold">
            On
          </span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/55">
          <div
            className="h-full rounded-full bg-[var(--vl-peach)] transition-[width] duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs font-bold text-[var(--vl-text-muted)]">
          <span>{phase === "recording" ? "Listening" : "Progress"}</span>
          <span>{sampleLabel}</span>
        </div>
      </Card>

      <div className="mt-4 grid gap-3">
        <InfoRow
          delayMs={120}
          label="Motion access"
          tone={phase === "unavailable" ? "warning" : "breath"}
          value={getMotionAccessLabel(phase)}
        />
        <InfoRow
          delayMs={160}
          label="Motion samples"
          tone={sampleCount > 0 ? "breath" : "neutral"}
          value={String(sampleCount)}
        />
      </div>

      {statusMessage ? (
        <div className="vl-glass animate-card-in mt-4 rounded-[22px] px-4 py-3.5">
          <p className="text-sm font-medium leading-6 text-[var(--vl-text-muted)]">
            {statusMessage}
          </p>
        </div>
      ) : null}

      {result ? (
        <section className="vl-result-card animate-card-in mt-4 p-4">
          <div className="flex flex-wrap gap-2">
            <span className="vl-peach-pill px-3 py-1 text-xs font-bold">
              Signal: {signalLabel}
            </span>
            <span className="vl-glass-pill px-3 py-1 text-xs font-bold text-[var(--vl-text-muted)]">
              Rhythm: {result.rhythmLabel}
            </span>
            <span className="vl-glass-pill px-3 py-1 text-xs font-bold text-[var(--vl-text-muted)]">
              Sample: {result.durationSeconds}s
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--vl-text-muted)]">
            Wellness-only motion signal summary. Not for medical decisions.
          </p>
        </section>
      ) : null}

      <div className="pointer-events-none sticky bottom-0 z-20 -mx-5 mt-auto px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-5">
        <div className="vl-action-dock pointer-events-auto space-y-2.5 p-2.5">
          <Button className="vl-dock-primary w-full" onClick={handlePrimaryAction}>
            {getPrimaryButtonLabel(phase)}
          </Button>
          <div className="grid grid-cols-[0.85fr_1.15fr] gap-2.5">
            <Button
              className="vl-dock-back min-h-12 w-full text-sm"
              onClick={onBack}
              variant="ghost"
            >
              Back
            </Button>
            <Button
              className="vl-dock-continue min-h-12 w-full text-sm"
              disabled={!canContinue}
              onClick={onNext}
              variant={canContinue ? "primary" : "secondary"}
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
