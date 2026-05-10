# VitalLens Architecture

VitalLens is a mobile-first wellness-only web app built with Next.js, React, and TypeScript. The app is organized around one linear flow:

```text
Intro -> Pulse Check -> Breath Motion Check -> Report
```

## High-Level Flow

1. `src/app/page.tsx` renders the app shell.
2. `src/app-shell/AppShell.tsx` manages the current step and stores completed Pulse and Breath results.
3. Pulse Check creates a `PulseCheckResult`.
4. Breath Motion Check creates a `BreathMotionResult`.
5. Report combines both results into a `WellnessReportInput`.
6. Report posts the payload to `/api/wellness-report`.
7. The API route calls IBM watsonx and returns a `WellnessSummaryResponse`.
8. If IBM is unavailable, the route returns a safe fallback response.

## Key Areas

### App Shell

`src/app-shell/AppShell.tsx` owns the user flow and result state. It passes callbacks into each feature screen so completed results can be stored without a global state library.

### Pulse

`src/features/pulse/` contains the Pulse Check experience:

- Rear camera access
- Torch/flash support where available
- Finger-camera signal sampling
- Finger gate and signal quality states
- Pulse estimate result UI
- Compact telemetry for the report

The Pulse Check does not store images, video, or camera frames in the report payload.

### Breath

`src/features/breath/` contains the Breath Motion Check:

- DeviceMotion permission handling
- Audio/voice guidance
- Position check before recording
- 30-second motion recording window
- Data-driven waveform from motion samples
- Compact telemetry for the report

The breath result is based on small phone movements while the phone rests against the chest or upper abdomen.

### Report

`src/features/report/` displays local results and manages the IBM summary request. Local Pulse and Breath results remain visible whether or not IBM watsonx is configured.

### Shared Types

`src/shared/types/check-flow.ts` defines the shared step IDs, result types, report payload, and IBM summary response shape.

### IBM watsonx API Route

`src/app/api/wellness-report/route.ts` runs server-side. It:

- Reads IBM watsonx environment variables
- Requests an IBM IAM token
- Sends structured Pulse and Breath data plus compact telemetry
- Prompts watsonx for concise wellness-only JSON
- Parses or recovers malformed model output
- Falls back safely for config, network, or IBM request failures

## Data Safety

The IBM payload is intentionally compact. It may include final result values, confidence/quality labels, sample durations, basic statistics, and downsampled numeric traces. It does not send raw camera frames, images, video, base64 content, or personally identifying data.

## Wellness Boundary

VitalLens is not a medical device. The app avoids diagnosis, treatment advice, medical decision support, normal/abnormal labels, and clinical accuracy claims.
