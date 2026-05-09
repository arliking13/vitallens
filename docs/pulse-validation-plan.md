# VitalLens Pulse Validation Plan

VitalLens Pulse is a non-medical wellness estimate. It is designed for a calm personal check-in experience, not diagnosis, treatment decisions, emergency use, or clinical monitoring.

## Goal

The validation goal is to compare VitalLens estimated BPM against ECG-labeled reference heart rate from public datasets. This helps quantify how often the current estimator returns a value, how close returned estimates are to reference HR, and whether the confidence labels are calibrated conservatively.

The primary future dataset is the Brno University of Technology Smartphone PPG Database, also known as BUT PPG. PhysioNet describes BUT PPG v2.0 as a smartphone PPG database with 3,888 10-second recordings, associated ECG signals for reference HR, PPG quality labels, and accelerometer data for many records. The smartphone camera plus LED or front camera collection modes make it a useful future comparison point for VitalLens Pulse.

BIDMC PPG and Respiration Dataset is a secondary reference dataset. It includes PPG, ECG, respiratory signals, and physiological numerics from clinical waveform data, but it is not smartphone-specific. It is useful for broader signal-processing checks and respiratory context, not as the main smartphone camera validation target.

## Why External Validation Matters

External validation helps test behavior that is hard to cover with a few local phone recordings:

- Signal quality thresholds across many skin tones, devices, and recording conditions.
- Motion artifacts from hand movement and body movement.
- Finger pressure changes that alter brightness and color channels.
- Lighting and exposure changes from phone cameras.
- Confidence calibration for low, fair, and good estimates.
- False-null behavior when a plausible signal is present but the estimator is conservative.
- Bad-signal rejection behavior when a dataset label indicates poor PPG quality.

## Planned Metrics

For each converted reference record, the evaluation scaffold should produce:

- Reference BPM from ECG-labeled HR.
- VitalLens estimated BPM when returned.
- Absolute error in BPM when an estimate is returned.
- Returned-estimate flag.
- Confidence label and confidence score.
- Source dataset and source quality label.

Aggregate validation metrics:

- Mean absolute error.
- Median absolute error.
- Percent within +/-5 BPM.
- Percent within +/-10 BPM.
- False-null count and false-null rate.
- Bad-signal rejection rate.
- Confidence calibration by low, fair, and good.

## Boundaries

This validation plan does not make VitalLens medical-grade. VitalLens does not diagnose conditions, does not measure blood pressure, does not measure SpO2, and does not claim ECG capability. ECG-labeled datasets are used only as external reference data for research evaluation of the non-medical wellness pulse estimate.

## Future Workflow

1. Download public datasets manually from their official sources.
2. Keep local data outside git, under `research-data/`.
3. Convert selected records into `ReferencePpgRecord`.
4. Run offline evaluation against the existing estimator.
5. Review false-null cases, bad-signal rejection, and confidence calibration.
6. Tune thresholds conservatively only after reviewing validation results.

## References

- BUT PPG on PhysioNet: https://physionet.org/content/butppg/
- BIDMC PPG and Respiration Dataset on PhysioNet: https://physionet.org/content/bidmc/
