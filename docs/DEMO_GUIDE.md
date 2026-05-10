# VitalLens Demo Guide

Use this guide for judges, a live walkthrough, or a short demo video.

## Recommended Device

Use a mobile browser. iPhone Safari works best when camera and motion permissions are granted from direct button taps.

## Demo Flow

1. Open VitalLens:

   ```text
   https://vitallens-iota.vercel.app
   ```

2. Start the Pulse Check.
3. Cover the rear camera lens with an index finger.
4. Hold still while the flash/torch turns on if supported.
5. Wait for the pulse estimate and confidence badge.
6. Continue to Breath Motion Check.
7. Start the guided check.
8. Place the phone against the chest or upper abdomen.
9. Follow the voice guidance and breathe normally.
10. Continue to the Report screen.
11. Review local Pulse and Breath results.
12. Tap Generate summary to request the IBM watsonx wellness summary.

## Suggested Narration

"VitalLens is a wellness-only mobile web app that uses sensors already available on a phone. First, it estimates pulse from a finger-camera signal using the rear camera and torch. Then it guides a breath motion check using the phone motion sensors while the phone rests against the chest or upper abdomen. The final report combines local results with a concise IBM watsonx summary that explains signal reliability and session quality."

## What To Point Out

- No extra hardware is required.
- The Breath check uses voice guidance because the user may not be looking at the screen.
- The Breath waveform is generated from recorded motion telemetry.
- Local results stay visible even if IBM watsonx is unavailable.
- The IBM summary is wellness-only and avoids medical claims.

## If Permissions Fail

- Camera: allow camera access in browser settings and reload.
- Motion: allow motion access when prompted on iOS.
- Torch: some browsers or devices do not expose torch control.
- IBM: if unavailable, the local report and fallback summary still demonstrate the core app flow.

## Safety Line

VitalLens is a wellness-only project and is not intended for diagnosis, treatment, or medical decision-making.
