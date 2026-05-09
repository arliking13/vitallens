# Pulse Research Validation

This folder contains typed, offline-only scaffolding for evaluating the VitalLens Pulse estimator against public reference datasets. It must not be imported by the production Pulse UI.

VitalLens Pulse is a non-medical wellness estimate. Research evaluation compares estimator output to reference BPM so thresholds and confidence labels can be reviewed conservatively. It does not make VitalLens medical-grade.

## Data Policy

Do not commit dataset files, converted records, caches, archives, or large research outputs. Keep local data under:

```text
research-data/
```

The repository ignores `research-data/` and `*.wfdb-cache`.

## Expected Future Workflow

1. Download a dataset manually from its official source.
2. Convert selected records into `ReferencePpgRecord`.
3. Run offline evaluation with `evaluatePulseEstimate`.
4. Compare VitalLens output to ECG reference BPM.
5. Tune thresholds conservatively after reviewing false-null behavior, bad-signal rejection, and confidence calibration.

## Dataset Notes

BUT PPG is the primary planned smartphone PPG validation dataset because it includes smartphone PPG recordings, ECG reference HR, quality labels, and movement conditions.

BIDMC PPG and Respiration Dataset is a secondary reference for broader PPG and respiration context, but it is not smartphone-camera-specific.

No loader is included yet. This scaffold intentionally avoids file reads, downloads, and dataset-specific parsing so production code remains untouched.
