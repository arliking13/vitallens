"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/shared/components/Button";
import { Card } from "@/shared/components/Card";
import { ScreenHeader } from "@/shared/components/ScreenHeader";
import type { BreathMotionResult } from "@/shared/types/check-flow";

import { BreathScanGuide } from "./BreathScanGuide";

type BreathCheckScreenProps = {
  onBack: () => void;
  onNext: () => void;
  onResult: (result: BreathMotionResult | null) => void;
};

type BreathPhase =
  | "idle"
  | "placement"
  | "starting"
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

type ContactCheckState = "idle" | "checking" | "ready" | "unavailable";

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
const CONTACT_CANVAS_SIZE = 24;
const CONTACT_SAMPLE_INTERVAL_MS = 350;
const ENABLE_BREATH_CAMERA_CONTACT_CHECK = false;

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
const flatBreathPath =
  "M4 74 C48 74 68 74 92 74 C116 74 140 74 164 74 C188 74 212 74 236 74";

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

function getDisplayMotionMagnitude(event: DeviceMotionEvent) {
  const accelerationMagnitude = getAccelerationMagnitude(event.acceleration);
  const rotationMagnitude = getRotationMagnitude(event.rotationRate);
  const gravityMagnitude = getAccelerationMagnitude(
    event.accelerationIncludingGravity,
  );

  if (accelerationMagnitude !== null && rotationMagnitude !== null) {
    return accelerationMagnitude + rotationMagnitude * 0.004;
  }

  if (accelerationMagnitude !== null) {
    return accelerationMagnitude;
  }

  if (rotationMagnitude !== null) {
    return rotationMagnitude * 0.004;
  }

  return gravityMagnitude;
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

function getFrameStats(
  data: Uint8ClampedArray,
  previousBrightnessValues: number[] | null,
) {
  const brightnessValues: number[] = [];

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    brightnessValues.push(red * 0.299 + green * 0.587 + blue * 0.114);
  }

  const mean = average(brightnessValues);
  const variation = standardDeviation(brightnessValues);
  const frameDelta =
    previousBrightnessValues &&
    previousBrightnessValues.length === brightnessValues.length
      ? average(
          brightnessValues.map((value, index) =>
            Math.abs(value - previousBrightnessValues[index]),
          ),
        )
      : null;

  return {
    brightnessValues,
    frameDelta,
    mean,
    variation,
  };
}

function isContactFrame({
  frameDelta,
  mean,
  variation,
}: {
  frameDelta: number | null;
  mean: number;
  variation: number;
}) {
  const veryDark = mean < 45;
  const lowDetail = variation < 12;
  const lowChange = frameDelta !== null && frameDelta < 2.4;

  return (
    veryDark ||
    (lowDetail && (frameDelta === null || lowChange)) ||
    (mean < 95 && lowDetail) ||
    (lowChange && mean < 90)
  );
}

function smoothMotionValues(values: number[]) {
  return values.map((value, index) => {
    const previous = values[index - 1] ?? value;
    const next = values[index + 1] ?? value;
    return (previous + value + next) / 3;
  });
}

function buildPreviewSignal(samples: BreathMotionSample[]) {
  const values = smoothMotionValues(
    samples.slice(-64).map((sample) => sample.value),
  );
  const range = getRange(values);

  if (values.length < 2 || range <= 0.003) {
    return undefined;
  }

  const mean = average(values);
  const displayAmplitude = Math.min(0.38, Math.max(0.04, range * 2));

  return values.map((value) =>
    clampSignalValue(0.5 + ((value - mean) / range) * displayAmplitude),
  );
}

function clampSignalValue(value: number) {
  return Math.min(1, Math.max(0, value));
}

function buildMotionWavePath(values?: number[], fallbackPath = flatBreathPath) {
  if (!values || values.length < 2) {
    return fallbackPath;
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
    return "Place your phone flat against your chest or upper abdomen.";
  }

  if (phase === "starting") {
    return "Keep the phone still while the check starts.";
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

  return "Place your phone flat against your chest or upper abdomen. Audio will guide you through the check.";
}

function getPreviewStatus(phase: BreathPhase) {
  if (phase === "placement") {
    return "Position check";
  }

  if (phase === "starting") {
    return "Starting";
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
  if (phase === "placement" || phase === "starting" || phase === "recording") {
    return "Stop breath check";
  }

  if (phase === "complete") {
    return "Run again";
  }

  return "Start guided breath check";
}

function getCardInstruction({
  phase,
  showStartAnyway,
}: {
  phase: BreathPhase;
  showStartAnyway: boolean;
}) {
  if (phase === "placement") {
    if (showStartAnyway) {
      return "You can continue with motion-only guidance.";
    }

    return "Waiting for the phone to become stable.";
  }

  if (phase === "starting") {
    return "Starting in three, two, one.";
  }

  if (phase === "recording") {
    return "Breathe normally while the phone stays still.";
  }

  if (phase === "complete") {
    return "Check complete.";
  }

  if (phase === "unavailable") {
    return "Motion access unavailable.";
  }

  return "Place your phone flat against your chest or upper abdomen, then tap start.";
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
  const [contactCheckState, setContactCheckState] =
    useState<ContactCheckState>("idle");
  const [placementElapsedSeconds, setPlacementElapsedSeconds] = useState(0);
  const [result, setResult] = useState<BreathMotionResult | null>(null);
  const [isBreathGuideOpen, setIsBreathGuideOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const contactCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const contactFrameCoveredCountRef = useRef(0);
  const contactIntervalRef = useRef<number | null>(null);
  const contactReadyRef = useRef(false);
  const intervalRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);
  const lastPreviewUpdateRef = useRef(0);
  const motionHandlerRef = useRef<((event: DeviceMotionEvent) => void) | null>(
    null,
  );
  const previousContactFrameRef = useRef<number[] | null>(null);
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const rearCameraStreamRef = useRef<MediaStream | null>(null);
  const rearCameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const placementSamplesRef = useRef<PlacementMotionSample[]>([]);
  const placementStartedAtRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const samplesRef = useRef<BreathMotionSample[]>([]);
  const uiTraceSamplesRef = useRef<BreathMotionSample[]>([]);
  const timersRef = useRef<number[]>([]);

  function clearTimers() {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];

    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (contactIntervalRef.current !== null) {
      window.clearInterval(contactIntervalRef.current);
      contactIntervalRef.current = null;
    }
  }

  function stopMotionListener() {
    if (motionHandlerRef.current) {
      window.removeEventListener("devicemotion", motionHandlerRef.current);
      motionHandlerRef.current = null;
    }
  }

  function stopContactCamera() {
    if (contactIntervalRef.current !== null) {
      window.clearInterval(contactIntervalRef.current);
      contactIntervalRef.current = null;
    }

    rearCameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    rearCameraStreamRef.current = null;

    if (rearCameraVideoRef.current) {
      rearCameraVideoRef.current.srcObject = null;
      rearCameraVideoRef.current = null;
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

  function sampleContactFrame() {
    const video = rearCameraVideoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return;
    }

    const canvas =
      contactCanvasRef.current ?? document.createElement("canvas");
    canvas.width = CONTACT_CANVAS_SIZE;
    canvas.height = CONTACT_CANVAS_SIZE;
    contactCanvasRef.current = canvas;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return;
    }

    try {
      context.drawImage(video, 0, 0, CONTACT_CANVAS_SIZE, CONTACT_CANVAS_SIZE);
      const { data } = context.getImageData(
        0,
        0,
        CONTACT_CANVAS_SIZE,
        CONTACT_CANVAS_SIZE,
      );
      const stats = getFrameStats(data, previousContactFrameRef.current);
      previousContactFrameRef.current = stats.brightnessValues;

      if (isContactFrame(stats)) {
        contactFrameCoveredCountRef.current += 1;
      } else {
        contactFrameCoveredCountRef.current = 0;
      }

      if (contactFrameCoveredCountRef.current >= 3) {
        contactReadyRef.current = true;
        setContactCheckState("ready");

        if (isPlacementStable(getRecentPlacementSamples(placementSamplesRef.current))) {
          beginRecordingCountdown(true);
        }
      }
    } catch {
      setContactCheckState("unavailable");
      setStatusMessage(
        "Camera contact check unavailable. You can start with motion-only guidance.",
      );
      stopContactCamera();
    }
  }

  async function startRearCameraContactCheck() {
    contactReadyRef.current = false;
    contactFrameCoveredCountRef.current = 0;
    previousContactFrameRef.current = null;
    setContactCheckState("checking");
    setStatusMessage(null);

      if (!ENABLE_BREATH_CAMERA_CONTACT_CHECK) {
    contactReadyRef.current = true;
    setContactCheckState("ready");
    return;
  }

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setContactCheckState("unavailable");
      setStatusMessage(
        "Camera contact check unavailable. You can start with motion-only guidance.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          height: { ideal: 120 },
          width: { ideal: 160 },
        },
      });
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      rearCameraStreamRef.current = stream;
      rearCameraVideoRef.current = video;

      await video.play();
      sampleContactFrame();
      contactIntervalRef.current = window.setInterval(
        sampleContactFrame,
        CONTACT_SAMPLE_INTERVAL_MS,
      );
    } catch {
      stopContactCamera();
      setContactCheckState("unavailable");
      setStatusMessage(
        "Camera contact check unavailable. You can start with motion-only guidance.",
      );
    }
  }

  function cancelGuidedCheck() {
    isRunningRef.current = false;
    clearTimers();
    stopMotionListener();
    stopContactCamera();
    placementSamplesRef.current = [];
    samplesRef.current = [];
    uiTraceSamplesRef.current = [];
    placementStartedAtRef.current = null;
    recordingStartedAtRef.current = null;
    contactReadyRef.current = false;
    setElapsedSeconds(0);
    setMotionSignal(undefined);
    setPhase("idle");
    setContactCheckState("idle");
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
    stopContactCamera();
    placementSamplesRef.current = [];
    placementStartedAtRef.current = null;
    recordingStartedAtRef.current = null;
    lastPreviewUpdateRef.current = 0;
    samplesRef.current = [];
    uiTraceSamplesRef.current = [];
    setElapsedSeconds(0);
    setMotionSignal(undefined);
    setPhase("starting");
    setContactCheckState("idle");
    setPlacementElapsedSeconds(0);
    setStatusMessage(null);
    speakSequence(
      announcePlacement
        ? ["Phone is stable.", "Starting in three, two, one.", "Breathe normally."]
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
    stopContactCamera();

    const startedAt = recordingStartedAtRef.current;
    const durationMs =
      startedAt === null
        ? 0
        : Math.min(RECORDING_DURATION_MS, performance.now() - startedAt);
    const nextResult = analyzeBreathMotion(samplesRef.current, durationMs);
    const nextSignal = buildPreviewSignal(
      uiTraceSamplesRef.current.length > 0
        ? uiTraceSamplesRef.current
        : samplesRef.current,
    );

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
    setPhase("recording");
    setElapsedSeconds(0);
    setMotionSignal(undefined);
    uiTraceSamplesRef.current = [];

    const handleMotion = (event: DeviceMotionEvent) => {
      const value = getMotionMagnitude(event);

      if (value === null) {
        return;
      }

      const displayValue = getDisplayMotionMagnitude(event) ?? value;
      const capturedAt = performance.now();
      samplesRef.current.push({
        t: capturedAt,
        value,
      });
      uiTraceSamplesRef.current = [
        ...uiTraceSamplesRef.current,
        {
          t: capturedAt,
          value: displayValue,
        },
      ].slice(-160);

      if (capturedAt - lastPreviewUpdateRef.current >= 250) {
        lastPreviewUpdateRef.current = capturedAt;
        const nextSignal = buildPreviewSignal(uiTraceSamplesRef.current);
        setMotionSignal(nextSignal);
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
      const recentPlacementSamples = getRecentPlacementSamples(
        placementSamplesRef.current,
      );

      if (
        contactReadyRef.current &&
        isPlacementStable(recentPlacementSamples)
      ) {
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
    uiTraceSamplesRef.current = [];
    placementStartedAtRef.current = null;
    recordingStartedAtRef.current = null;
    contactReadyRef.current = false;
    contactFrameCoveredCountRef.current = 0;
    previousContactFrameRef.current = null;
    lastPreviewUpdateRef.current = 0;
    isRunningRef.current = true;
    onResult(null);
    setElapsedSeconds(0);
    setMotionSignal(undefined);
    setPhase("placement");
    setContactCheckState("checking");
    setPlacementElapsedSeconds(0);
    setResult(null);
    setStatusMessage(null);
    prepareAudio();
    speakSequence([
  "Place your phone against your chest or upper abdomen.",
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

    await startRearCameraContactCheck();

    if (!isRunningRef.current) {
      return;
    }

    startPlacementCheck();
  }

  function handlePrimaryAction() {
    if (phase === "placement") {
      cancelGuidedCheck();
      return;
    }

    if (phase === "starting") {
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

      stopContactCamera();

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

      synthesis?.removeEventListener("voiceschanged", handleVoicesChanged);
      void audioContextRef.current?.close();
    };
  }, []);

  const progressPercent =
    phase === "recording" || phase === "complete"
      ? Math.min(100, (elapsedSeconds / RECORDING_DURATION_SECONDS) * 100)
      : 0;
  const roundedElapsedSeconds = Math.round(elapsedSeconds);
  const sampleLabel =
    phase === "placement"
      ? `${Math.round(placementElapsedSeconds)}s`
      : result
        ? `${result.durationSeconds}s`
        : phase === "starting"
          ? "Starting"
          : `${roundedElapsedSeconds}s / ${RECORDING_DURATION_SECONDS}s`;
  const progressLabel =
    phase === "placement"
      ? "Position check"
      : phase === "starting"
        ? "Countdown"
        : "Progress";
  const canContinue = phase === "complete" || phase === "unavailable";
  const signalLabel = result?.motionDetected ? "Detected" : "Low";
  const statusLabel = getPreviewStatus(phase);
  const isDataDrivenWaveform =
    phase === "recording" || phase === "complete";
  const wavePath =
    isDataDrivenWaveform
      ? buildMotionWavePath(motionSignal, flatBreathPath)
      : flatBreathPath;
  const waveLabel =
    phase === "recording"
      ? "Live phone motion trace"
      : phase === "complete"
        ? "Recorded phone motion trace"
        : "Motion trace idle";
  const showStartAnyway =
    phase === "placement" &&
    (placementElapsedSeconds >= PLACEMENT_START_ANYWAY_SECONDS ||
      contactCheckState === "unavailable");
  const cardInstruction = getCardInstruction({
  phase,
  showStartAnyway,
});

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col pb-32">
      <ScreenHeader
        description={getHeaderDescription(phase)}
        title="Breath motion check"
      />

      <Card
        className="mt-6 overflow-hidden"
        delayMs={40}
        padding="sm"
      >
        <div className="flex items-center justify-between gap-3 px-1 pb-4">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-[var(--vl-text)]">
                Phone motion check
              </p>
              <button
                aria-label="Open breath guide"
                className="vl-scan-guide-pill interactive-press focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--vl-peach)]"
                onClick={() => setIsBreathGuideOpen(true)}
                type="button"
              >
                Breath guide
              </button>
            </div>
            <p className="mt-1 text-sm leading-5 text-[var(--vl-text-muted)]">
              Guided by voice. Measured from small phone movements.
            </p>
          </div>
          <span
            className={[
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold",
              phase === "placement" ||
              phase === "starting" ||
              phase === "recording"
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
          className="relative h-56 overflow-hidden rounded-[22px] border border-white/70 bg-white/35"
          aria-hidden="true"
        >
          <div className="absolute inset-x-4 top-4 flex items-center justify-between text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--vl-text-faint)]">
            <span>{waveLabel}</span>
            <span>{isDataDrivenWaveform ? "Sensor data" : "Inactive"}</span>
          </div>
          <div className="absolute inset-x-5 top-1/2 h-px bg-[rgba(7,27,58,0.08)]" />
          <svg
            className="absolute inset-x-4 bottom-8 h-32 transition-opacity duration-200"
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
          <span>{progressLabel}</span>
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
            <span className="vl-glass-pill px-3 py-1 text-xs font-bold text-[var(--vl-text-muted)]">
              Source: Phone motion
            </span>
            <span className="vl-glass-pill px-3 py-1 text-xs font-bold text-[var(--vl-text-muted)]">
              Quality: {result.qualityLabel}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--vl-text-muted)]">
            Measured from small phone movements while resting against your chest or
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

      {isBreathGuideOpen ? (
        <BreathScanGuide onClose={() => setIsBreathGuideOpen(false)} />
      ) : null}
    </div>
  );
}
