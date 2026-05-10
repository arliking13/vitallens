"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/shared/components/Button";
import { Card } from "@/shared/components/Card";
import { ScreenHeader } from "@/shared/components/ScreenHeader";
import type { BreathMotionResult } from "@/shared/types/check-flow";

type BreathCheckScreenProps = {
  onBack: () => void;
  onNext: () => void;
  onResult: (result: BreathMotionResult | null) => void;
};

type BreathPhase =
  | "idle"
  | "placement"
  | "recording"
  | "complete"
  | "unavailable";

type BreathMotionSample = {
  t: number;
  value: number;
};

type PlacementMotionSample = {
  accelerationMagnitude: number | null;
  gravityMagnitude: number | null;
  rotationMagnitude: number | null;
  t: number;
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
const PLACEMENT_WINDOW_MS = 3000;
const PLACEMENT_MIN_DURATION_MS = 2200;
const PLACEMENT_CHECK_INTERVAL_MS = 250;
const PLACEMENT_START_ANYWAY_SECONDS = 12;

const fallbackMessage =
  "Motion access unavailable. You can continue with pulse-only report.";
const preferredVoiceNames = [
  "samantha",
  "ava",
  "karen",
  "siri",
  "victoria",
  "moira",
  "tessa",
  "serena",
  "daniel",
  "alex",
];
const calmBreathPath =
  "M4 74 C26 32 54 32 76 74 C98 116 126 116 148 74 C170 32 198 32 236 74";

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

function getAccelerationMagnitude(
  acceleration: DeviceMotionEventAcceleration | null,
) {
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

function getRotationMagnitude(rotationRate: DeviceMotionEventRotationRate | null) {
  if (!rotationRate) {
    return null;
  }

  const alpha = rotationRate.alpha;
  const beta = rotationRate.beta;
  const gamma = rotationRate.gamma;
  const hasRotationValue =
    typeof alpha === "number" ||
    typeof beta === "number" ||
    typeof gamma === "number";

  if (!hasRotationValue) {
    return null;
  }

  return Math.hypot(alpha ?? 0, beta ?? 0, gamma ?? 0);
}

function getPlacementMotionSample(
  event: DeviceMotionEvent,
): PlacementMotionSample | null {
  const accelerationMagnitude = getAccelerationMagnitude(event.acceleration);
  const gravityMagnitude = getAccelerationMagnitude(
    event.accelerationIncludingGravity,
  );
  const rotationMagnitude = getRotationMagnitude(event.rotationRate);

  if (
    accelerationMagnitude === null &&
    gravityMagnitude === null &&
    rotationMagnitude === null
  ) {
    return null;
  }

  return {
    accelerationMagnitude,
    gravityMagnitude,
    rotationMagnitude,
    t: performance.now(),
  };
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

function clampSignalValue(value: number) {
  return Math.min(1, Math.max(0, value));
}

function buildMotionWavePath(values?: number[]) {
  if (!values || values.length < 2) {
    return calmBreathPath;
  }

  const width = 232;
  const startX = 4;
  const baseY = 92;
  const amplitude = 56;
  const stepX = width / (values.length - 1);
  const points = values.map((value, index) => ({
    x: startX + stepX * index,
    y: baseY - clampSignalValue(value) * amplitude,
  }));

  return points.slice(1).reduce((path, point, index) => {
    const previousPoint = points[index];
    const controlX = (previousPoint.x + point.x) / 2;
    return `${path} C ${controlX} ${previousPoint.y} ${controlX} ${point.y} ${point.x} ${point.y}`;
  }, `M${points[0].x} ${points[0].y}`);
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

function getRecentPlacementSamples(samples: PlacementMotionSample[]) {
  const latestSample = samples.at(-1);
  if (!latestSample) {
    return [];
  }

  return samples.filter(
    (sample) => latestSample.t - sample.t <= PLACEMENT_WINDOW_MS,
  );
}

function valuesFromPlacementSamples(
  samples: PlacementMotionSample[],
  key: keyof Omit<PlacementMotionSample, "t">,
) {
  return samples
    .map((sample) => sample[key])
    .filter((value): value is number => typeof value === "number");
}

function isPlacementStable(samples: PlacementMotionSample[]) {
  const firstSample = samples[0];
  const latestSample = samples.at(-1);

  if (
    samples.length < 12 ||
    !firstSample ||
    !latestSample ||
    latestSample.t - firstSample.t < PLACEMENT_MIN_DURATION_MS
  ) {
    return false;
  }

  const gravityValues = valuesFromPlacementSamples(samples, "gravityMagnitude");
  const accelerationValues = valuesFromPlacementSamples(
    samples,
    "accelerationMagnitude",
  );
  const rotationValues = valuesFromPlacementSamples(samples, "rotationMagnitude");
  const hasPlacementSignal =
    gravityValues.length >= 6 ||
    accelerationValues.length >= 6 ||
    rotationValues.length >= 6;
  const gravityStable =
    gravityValues.length < 6 ||
    (standardDeviation(gravityValues) <= 0.22 && getRange(gravityValues) <= 0.9);
  const accelerationStable =
    accelerationValues.length < 6 ||
    (average(accelerationValues) <= 0.45 &&
      standardDeviation(accelerationValues) <= 0.28);
  const rotationStable =
    rotationValues.length < 6 ||
    (average(rotationValues) <= 9 && getRange(rotationValues) <= 36);

  return (
    hasPlacementSignal &&
    gravityStable &&
    accelerationStable &&
    rotationStable
  );
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
  if (phase === "placement") {
    return "Place your phone on your chest or upper abdomen and keep it still.";
  }

  if (phase === "recording") {
    return "Keep the phone still and breathe normally.";
  }

  if (phase === "complete") {
    return "Your wellness-only motion summary is ready.";
  }

  if (phase === "unavailable") {
    return fallbackMessage;
  }

  return "Place your phone on your chest or upper abdomen. Audio will guide the check.";
}

function getPreviewStatus(phase: BreathPhase) {
  if (phase === "placement") {
    return "Placement";
  }

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
  if (phase === "placement" || phase === "recording") {
    return "Stop breath check";
  }

  if (phase === "complete") {
    return "Run again";
  }

  return "Start guided breath check";
}

function getCardInstruction(phase: BreathPhase) {
  if (phase === "placement") {
    return "Waiting for stable placement";
  }

  if (phase === "recording") {
    return "Keep the phone still and breathe normally.";
  }

  if (phase === "complete") {
    return "Check complete.";
  }

  if (phase === "unavailable") {
    return "Motion access unavailable.";
  }

  return "Place your phone, then tap start.";
}

function getPreferredSpeechVoice() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  const englishVoices = voices.filter((voice) =>
    voice.lang.toLowerCase().startsWith("en"),
  );

  for (const preferredName of preferredVoiceNames) {
    const voice = englishVoices.find((englishVoice) =>
      englishVoice.name.toLowerCase().includes(preferredName),
    );

    if (voice) {
      return voice;
    }
  }

  return (
    englishVoices.find((voice) => voice.localService) ??
    englishVoices[0] ??
    null
  );
}

export function BreathCheckScreen({
  onBack,
  onNext,
  onResult,
}: BreathCheckScreenProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [motionSignal, setMotionSignal] = useState<number[] | undefined>();
  const [phase, setPhase] = useState<BreathPhase>("idle");
  const [placementElapsedSeconds, setPlacementElapsedSeconds] = useState(0);
  const [result, setResult] = useState<BreathMotionResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const lastPreviewUpdateRef = useRef(0);
  const motionHandlerRef = useRef<((event: DeviceMotionEvent) => void) | null>(
    null,
  );
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const placementSamplesRef = useRef<PlacementMotionSample[]>([]);
  const placementStartedAtRef = useRef<number | null>(null);
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
    preferredVoiceRef.current =
      getPreferredSpeechVoice() ?? preferredVoiceRef.current;
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
      const preferredVoice =
        preferredVoiceRef.current ?? getPreferredSpeechVoice();
      preferredVoiceRef.current = preferredVoice;

      if (preferredVoice) {
        utterance.voice = preferredVoice;
        utterance.lang = preferredVoice.lang;
      } else {
        utterance.lang = "en-US";
      }

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

  function cancelGuidedCheck() {
    isRunningRef.current = false;
    clearTimers();
    stopMotionListener();
    placementSamplesRef.current = [];
    samplesRef.current = [];
    placementStartedAtRef.current = null;
    recordingStartedAtRef.current = null;
    setElapsedSeconds(0);
    setMotionSignal(undefined);
    setPhase("idle");
    setPlacementElapsedSeconds(0);
    setResult(null);
    setStatusMessage(null);
    onResult(null);

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  function beginRecordingCountdown(announcePlacement: boolean) {
    if (!isRunningRef.current) {
      return;
    }

    clearTimers();
    stopMotionListener();
    placementSamplesRef.current = [];
    placementStartedAtRef.current = null;
    recordingStartedAtRef.current = null;
    lastPreviewUpdateRef.current = 0;
    samplesRef.current = [];
    setElapsedSeconds(0);
    setMotionSignal(undefined);
    setPhase("recording");
    setPlacementElapsedSeconds(0);
    setStatusMessage(null);
    speakSequence(
      announcePlacement
        ? ["Placement detected.", "Starting in three, two, one.", "Breathe normally."]
        : ["Starting in three, two, one.", "Breathe normally."],
    );

    timersRef.current.push(
      window.setTimeout(startMotionCollection, START_GUIDE_DELAY_MS),
    );
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
    setStatusMessage(null);
    onResult(nextResult);
    speakSequence(["Check complete."]);
  }

  function startMotionCollection() {
    if (!isRunningRef.current) {
      return;
    }

    recordingStartedAtRef.current = performance.now();

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

      if (nextElapsedSeconds >= RECORDING_DURATION_SECONDS) {
        completeRecording();
      }
    }, 250);

    timersRef.current.push(
      window.setTimeout(() => speak("Halfway there."), HALFWAY_GUIDE_MS),
      window.setTimeout(() => speak("Almost done."), ALMOST_DONE_GUIDE_MS),
    );
  }

  function startPlacementCheck() {
    if (!isRunningRef.current) {
      return;
    }

    placementSamplesRef.current = [];
    placementStartedAtRef.current = performance.now();
    setPlacementElapsedSeconds(0);

    const handleMotion = (event: DeviceMotionEvent) => {
      const placementSample = getPlacementMotionSample(event);

      if (!placementSample) {
        return;
      }

      placementSamplesRef.current.push(placementSample);
      const motionMagnitude =
        placementSample.gravityMagnitude ??
        placementSample.accelerationMagnitude ??
        placementSample.rotationMagnitude;
      const recentPlacementSamples = getRecentPlacementSamples(
        placementSamplesRef.current,
      );

      if (
        motionMagnitude !== null &&
        placementSample.t - lastPreviewUpdateRef.current >= 250
      ) {
        lastPreviewUpdateRef.current = placementSample.t;
        setMotionSignal(
          buildPreviewSignal(
            recentPlacementSamples
              .map((sample) => ({
                t: sample.t,
                value:
                  sample.gravityMagnitude ??
                  sample.accelerationMagnitude ??
                  sample.rotationMagnitude,
              }))
              .filter(
                (sample): sample is BreathMotionSample =>
                  typeof sample.value === "number",
              ),
          ),
        );
      }

      if (isPlacementStable(recentPlacementSamples)) {
        beginRecordingCountdown(true);
      }
    };

    motionHandlerRef.current = handleMotion;
    window.addEventListener("devicemotion", handleMotion);

    intervalRef.current = window.setInterval(() => {
      const startedAt = placementStartedAtRef.current;
      if (startedAt === null) {
        return;
      }

      setPlacementElapsedSeconds((performance.now() - startedAt) / 1000);
    }, PLACEMENT_CHECK_INTERVAL_MS);
  }

  async function startGuidedCheck() {
    clearTimers();
    stopMotionListener();
    placementSamplesRef.current = [];
    samplesRef.current = [];
    placementStartedAtRef.current = null;
    recordingStartedAtRef.current = null;
    lastPreviewUpdateRef.current = 0;
    isRunningRef.current = true;
    onResult(null);
    setElapsedSeconds(0);
    setMotionSignal(undefined);
    setPhase("placement");
    setPlacementElapsedSeconds(0);
    setResult(null);
    setStatusMessage(null);
    prepareAudio();
    speakSequence([
      "Place your phone on your chest or upper abdomen.",
      "Keep it still.",
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
      setMotionSignal(undefined);
      onResult(null);
      speakSequence([fallbackMessage]);
      return;
    }

    startPlacementCheck();
  }

  function handlePrimaryAction() {
    if (phase === "placement") {
      cancelGuidedCheck();
      return;
    }

    if (phase === "recording") {
      if (recordingStartedAtRef.current === null) {
        cancelGuidedCheck();
      } else {
        completeRecording();
      }
      return;
    }

    void startGuidedCheck();
  }

  function handleStartAnyway() {
    beginRecordingCountdown(false);
  }

  useEffect(() => {
    const synthesis =
      typeof window !== "undefined" && "speechSynthesis" in window
        ? window.speechSynthesis
        : null;

    function handleVoicesChanged() {
      preferredVoiceRef.current =
        getPreferredSpeechVoice() ?? preferredVoiceRef.current;
    }

    handleVoicesChanged();
    synthesis?.addEventListener("voiceschanged", handleVoicesChanged);

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

      synthesis?.removeEventListener("voiceschanged", handleVoicesChanged);
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
  const statusLabel = getPreviewStatus(phase);
  const wavePath = buildMotionWavePath(motionSignal);
  const cardInstruction = getCardInstruction(phase);
  const showStartAnyway =
    phase === "placement" &&
    placementElapsedSeconds >= PLACEMENT_START_ANYWAY_SECONDS;

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col pb-32">
      <ScreenHeader
        description={getHeaderDescription(phase)}
        title="Breath motion check"
      />

      <Card
        className={[
          "signal-preview mt-6 overflow-hidden",
          phase === "placement" || phase === "recording"
            ? "signal-breathe"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        delayMs={40}
        padding="sm"
      >
        <div className="flex items-center justify-between gap-3 px-1 pb-4">
          <div>
            <p className="text-sm font-bold text-[var(--vl-text)]">
              Phone motion check
            </p>
            <p className="mt-1 text-sm leading-5 text-[var(--vl-text-muted)]">
              Guided by voice. Measured from small phone movements.
            </p>
          </div>
          <span
            className={[
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold",
              phase === "placement" || phase === "recording"
                ? "vl-peach-pill"
                : "vl-glass-pill text-[var(--vl-text-muted)]",
            ].join(" ")}
          >
            {statusLabel}
          </span>
        </div>
        <p className="px-1 pb-3 text-sm font-bold text-[var(--vl-text)]">
          {cardInstruction}
        </p>

        <div
          className="relative h-56 overflow-hidden rounded-[22px] bg-white/35"
          aria-hidden="true"
        >
          <div className="signal-glow absolute left-1/2 top-8 h-24 w-24 -translate-x-1/2 rounded-full bg-[rgba(244,124,98,0.12)] blur-2xl" />
          <div className="signal-orb absolute left-1/2 top-7 h-28 w-16 -translate-x-1/2 rounded-[24px] border border-white/80 bg-white/70 shadow-[inset_0_0_0_7px_rgba(244,124,98,0.08),0_16px_40px_rgba(244,124,98,0.14)]" />
          <svg
            className="signal-wave absolute inset-x-4 bottom-9 h-28"
            preserveAspectRatio="none"
            viewBox="0 0 240 128"
          >
            <path
              d={wavePath}
              fill="none"
              opacity="0.16"
              stroke="var(--vl-peach)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="18"
            />
            <path
              d={wavePath}
              fill="none"
              stroke="var(--vl-peach)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="7"
            />
          </svg>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/55">
          <div
            className="h-full rounded-full bg-[var(--vl-peach)] transition-[width] duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs font-bold text-[var(--vl-text-muted)]">
          <span>Progress</span>
          <span>{sampleLabel}</span>
        </div>
        {showStartAnyway ? (
          <Button
            className="mt-4 min-h-10 w-full text-sm"
            onClick={handleStartAnyway}
            variant="secondary"
          >
            Start anyway
          </Button>
        ) : null}
      </Card>

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
              Motion: {signalLabel}
            </span>
            <span className="vl-glass-pill px-3 py-1 text-xs font-bold text-[var(--vl-text-muted)]">
              Rhythm: {result.rhythmLabel}
            </span>
            <span className="vl-glass-pill px-3 py-1 text-xs font-bold text-[var(--vl-text-muted)]">
              Sample: {result.durationSeconds}s
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--vl-text-muted)]">
            Detected from small phone movements while resting on your chest or
            abdomen.
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
