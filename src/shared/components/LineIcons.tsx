import type { ReactNode, SVGProps } from "react";

type LineIconProps = SVGProps<SVGSVGElement>;

type IconShellProps = LineIconProps & {
  children: ReactNode;
};

function IconShell({ children, ...props }: IconShellProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      {...props}
    >
      {children}
    </svg>
  );
}

export function HeartIcon(props: LineIconProps) {
  return (
    <IconShell {...props}>
      <path d="M12 20.2 5.7 14C2.4 10.7 3.7 5.5 8.1 5.5c1.7 0 3.1.9 3.9 2.2.8-1.3 2.2-2.2 3.9-2.2 4.4 0 5.7 5.2 2.4 8.5L12 20.2Z" />
    </IconShell>
  );
}

export function BreathWavesIcon(props: LineIconProps) {
  return (
    <IconShell {...props}>
      <path d="M4 7.4c2.2-1.9 4.4-1.9 6.6 0s4.4 1.9 6.6 0" />
      <path d="M4 12c2.2-1.9 4.4-1.9 6.6 0s4.4 1.9 6.6 0" />
      <path d="M4 16.6c2.2-1.9 4.4-1.9 6.6 0s4.4 1.9 6.6 0" />
    </IconShell>
  );
}

export function ReportIcon(props: LineIconProps) {
  return (
    <IconShell {...props}>
      <path d="M7 3.8h6.1L18 8.7v11.5H7V3.8Z" />
      <path d="M13 4v5h5" />
      <path d="M9.7 16.8v-3.1" />
      <path d="M12.5 16.8v-5.7" />
      <path d="M15.3 16.8v-2" />
    </IconShell>
  );
}

export function FingerTapIcon(props: LineIconProps) {
  return (
    <IconShell {...props}>
      <path d="M10.3 11.5V6.9a1.7 1.7 0 1 1 3.4 0v6.3" />
      <path d="m13.7 12.9 1.1-.7a1.7 1.7 0 0 1 2.5 1.5v2.2c0 2.6-1.9 4.6-4.5 4.6h-1.1c-1.8 0-3.4-.9-4.4-2.4l-1.5-2.2a1.4 1.4 0 0 1 2.1-1.8l2.4 2.1" />
      <path d="M7.2 5.5 5.5 3.8" />
      <path d="M16.8 5.5l1.7-1.7" />
      <path d="M12 3V1.8" />
    </IconShell>
  );
}

export function ScanPlayIcon(props: LineIconProps) {
  return (
    <IconShell {...props}>
      <path d="M5 8V5h3" />
      <path d="M16 5h3v3" />
      <path d="M19 16v3h-3" />
      <path d="M8 19H5v-3" />
      <path d="M10 8.8v6.4l5-3.2-5-3.2Z" />
    </IconShell>
  );
}

export function SparkIcon(props: LineIconProps) {
  return (
    <IconShell {...props}>
      <path d="M12 3.5 13.7 9l5.3 1.7-5.3 1.8L12 18l-1.7-5.5L5 10.7 10.3 9 12 3.5Z" />
      <path d="M18.5 15.2v3.3" />
      <path d="M16.8 16.8h3.4" />
    </IconShell>
  );
}

export function CheckIcon(props: LineIconProps) {
  return (
    <IconShell {...props}>
      <path d="m6 12.5 3.7 3.7L18.5 7.4" />
    </IconShell>
  );
}

export function CameraIcon(props: LineIconProps) {
  return (
    <IconShell {...props}>
      <path d="M5 7.5h3l1.3-2h5.4l1.3 2h3a1.7 1.7 0 0 1 1.7 1.7v8.1A1.7 1.7 0 0 1 19 19H5a1.7 1.7 0 0 1-1.7-1.7V9.2A1.7 1.7 0 0 1 5 7.5Z" />
      <path d="M12 16a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2Z" />
    </IconShell>
  );
}
