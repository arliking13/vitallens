# VitalLens

VitalLens is a mobile-first wellness check-in that uses phone sensors to estimate pulse, capture breath motion, and generate a wellness-only AI summary with IBM watsonx.

## Live Demo

https://vitallens-iota.vercel.app

## Source Code

https://github.com/arliking13/vitallens

The GitHub repository should be used as the source code reference because the zip file may be too large to upload directly.

## What VitalLens Does

- Pulse check: estimates pulse from a finger-camera signal using the rear camera and torch when supported.
- Breath motion check: records small phone movements while the phone rests against the chest or upper abdomen.
- Report screen: combines local Pulse and Breath results into one wellness-only check-in.
- IBM watsonx summary: sends structured results plus compact telemetry to a server-side route for a concise AI summary.
- Safe fallback: keeps local results visible and returns a simple fallback if IBM watsonx is unavailable.

## Why I Built It

VitalLens explores how ordinary phone sensors can support a quick, accessible wellness check-in without extra hardware. The goal is to make the experience simple on mobile: a rear-camera pulse estimate, an audio-guided breath motion check, and a short report that helps users understand session quality. It is intentionally wellness-only and avoids medical claims.

## Tech Stack

- Next.js
- React
- TypeScript
- Vercel
- IBM Cloud
- IBM watsonx
- DeviceMotion API
- MediaDevices API / Camera API
- Web Speech API
- CSS

## Architecture Overview

Flow:

1. User completes Pulse Check -> result saved in app state.
2. User completes Breath Check -> result saved in app state.
3. Report screen combines both results.
4. Report sends structured data plus compact telemetry to `/api/wellness-report`.
5. API route calls IBM watsonx.
6. If IBM fails, local results remain visible and a fallback summary is shown.

Key folders and files:

- `src/app-shell/AppShell.tsx`: top-level check flow and shared result state.
- `src/features/pulse/`: Pulse camera UI, PPG sampling, signal quality, and pulse estimate flow.
- `src/features/breath/`: Breath motion check, voice guidance, motion waveform, and result UI.
- `src/features/report/`: Local result cards and IBM summary UI.
- `src/app/api/wellness-report/route.ts`: server-side IBM watsonx integration.
- `src/shared/types/check-flow.ts`: shared flow, result, and report payload types.

## Pulse Check

The Pulse Check uses the rear camera stream and the torch/flash when supported by the browser and device. The user covers the rear camera with a finger, and VitalLens samples the finger-camera signal to estimate pulse. The UI tracks signal quality, confidence, and clean sample duration.

The pulse value is a wellness-only estimate. VitalLens does not claim clinical accuracy and is not intended for medical decisions.

## Breath Motion Check

The Breath Motion Check uses the DeviceMotion API while the phone rests against the chest or upper abdomen. Voice guidance helps because the user may not be watching the screen during the check.

During recording, the waveform is generated from motion telemetry. The result includes:

- Motion: detected or low
- Rhythm: steady, uneven, or not enough motion
- Quality: good, fair, or low
- Sample duration

## IBM watsonx Summary

The IBM summary is generated through a server-side Next.js API route. The route sends final Pulse and Breath results plus compact telemetry, including downsampled traces and basic signal statistics.

The prompt asks watsonx to interpret:

- Pulse signal reliability
- Breath motion consistency
- Overall session quality
- What may have reduced confidence
- One practical way to repeat the check more cleanly

The prompt also keeps the output wellness-only. It avoids diagnosis, treatment advice, medical claims, and normal/abnormal labels. If IBM watsonx is not configured or unavailable, the app returns a safe fallback while keeping local results visible.

## Environment Variables

Create `.env.local` for local development:

```env
IBM_WATSONX_API_KEY=
IBM_WATSONX_URL=https://ca-tor.ml.cloud.ibm.com
IBM_WATSONX_MODEL_ID=mistralai/mistral-small-3-1-24b-instruct-2503
IBM_WATSONX_PROJECT_ID=
IBM_WATSONX_VERSION=2024-03-14
```

Do not commit `.env.local`. Use Vercel Environment Variables for deployment.

## Local Setup

Install dependencies:

```bash
npm install
```

Run locally on Windows:

```bash
npm.cmd run dev
```

Validate on Windows:

```bash
npm.cmd run lint
npm.cmd run build
```

Run validation on macOS/Linux:

```bash
npm run lint
npm run build
```

## IBM watsonx Setup

1. Create an IBM Cloud account.
2. Create or use a watsonx.ai project.
3. Create an IBM Cloud API key or Service ID API key.
4. Copy the Project ID from the watsonx.ai project.
5. Find an available instruct model for the selected region.
6. Add the env vars to `.env.local` and Vercel.
7. Redeploy after changing env vars.

For the current Toronto endpoint, the working model used is:

```text
mistralai/mistral-small-3-1-24b-instruct-2503
```

## Deployment

VitalLens is deployed on Vercel.

1. Connect the GitHub repository to Vercel.
2. Add IBM watsonx variables in Vercel Project Settings -> Environment Variables.
3. Redeploy after environment variable changes.
4. Open the app on a mobile browser for the best demo experience.

## Limitations

- VitalLens is wellness-only and is not a medical device.
- Camera and motion permissions vary by browser and device.
- Torch support depends on the device and browser.
- iPhone Safari requires a user gesture for camera access.
- DeviceMotion access may require explicit permission on iOS.
- IBM summary generation depends on valid env vars, endpoint availability, and model availability.

## Demo Guide

1. Open the app on mobile.
2. Start Pulse Check.
3. Cover the rear camera with a finger.
4. Complete the pulse estimate.
5. Start Breath Motion Check.
6. Place the phone against the chest or upper abdomen.
7. Follow voice guidance.
8. Open Report.
9. Generate the IBM summary.

## Future Improvements

- Downloadable report image
- Broader device testing
- Better signal quality guidance
- Richer IBM report interpretation
- Optional history/comparison snapshots

## Disclaimer

VitalLens is a wellness-only project and is not intended for diagnosis, treatment, or medical decision-making.
