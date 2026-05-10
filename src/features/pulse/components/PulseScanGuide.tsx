"use client";

import { useEffect, useState, type TouchEvent } from "react";
import Image from "next/image";

import { Button } from "@/shared/components/Button";
import {
  CameraIcon,
  FingerTapIcon,
  ScanPlayIcon,
} from "@/shared/components/LineIcons";

type PulseScanGuideProps = {
  onClose: () => void;
};

const SWIPE_THRESHOLD_PX = 48;

const guideSlides = [
  {
    body: "Take your phone in one hand and turn the rear camera toward you.",
    FallbackIcon: CameraIcon,
    imageAlt: "A hand holding a phone with the rear camera turned toward the user.",
    imageSrc: "/pulse-scan-guide-step-1.png",
    stepLabel: "Step 1",
    title: "Hold your phone",
  },
  {
    body: "Place your index finger over the rear camera lens and hold still during the reading.",
    FallbackIcon: FingerTapIcon,
    imageAlt: "An index finger covering the rear camera lens.",
    imageSrc: "/pulse-scan-guide-step-2.png",
    stepLabel: "Step 2",
    title: "Cover the camera",
  },
  {
    body: "Tap Start scan and hold still. The flash will turn on during the reading.",
    FallbackIcon: ScanPlayIcon,
    imageAlt: "A phone camera covered by a finger with the flash turned on.",
    imageSrc: "/pulse-scan-guide-step-3.png",
    stepLabel: "Step 3",
    title: "Start the scan",
  },
];

export function PulseScanGuide({ onClose }: PulseScanGuideProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedImageIndexes, setFailedImageIndexes] = useState<number[]>([]);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const activeSlide = guideSlides[activeIndex];
  const isFirstSlide = activeIndex === 0;
  const isLastSlide = activeIndex === guideSlides.length - 1;
  const imageFailed = failedImageIndexes.includes(activeIndex);
  const FallbackIcon = activeSlide.FallbackIcon;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  function goToPreviousSlide() {
    setActiveIndex((currentIndex) => Math.max(currentIndex - 1, 0));
  }

  function goToNextSlide() {
    setActiveIndex((currentIndex) =>
      Math.min(currentIndex + 1, guideSlides.length - 1),
    );
  }

  function handleImageError() {
    setFailedImageIndexes((currentIndexes) =>
      currentIndexes.includes(activeIndex)
        ? currentIndexes
        : [...currentIndexes, activeIndex],
    );
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    setTouchStartX(event.touches[0]?.clientX ?? null);
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (touchStartX === null) {
      return;
    }

    const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX;
    const swipeDistance = touchEndX - touchStartX;

    if (Math.abs(swipeDistance) >= SWIPE_THRESHOLD_PX) {
      if (swipeDistance < 0) {
        goToNextSlide();
      } else {
        goToPreviousSlide();
      }
    }

    setTouchStartX(null);
  }

  return (
    <div
      aria-labelledby="pulse-scan-guide-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(7,27,58,0.28)] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-8 backdrop-blur-sm sm:items-center sm:pb-8"
      role="dialog"
    >
      <button
        aria-label="Close scan guide"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
        type="button"
      />

      <section
        className="vl-glass-card animate-card-in relative z-10 max-h-[min(92dvh,740px)] w-full max-w-[430px] overflow-y-auto p-4 shadow-[0_22px_70px_rgba(7,27,58,0.20)]"
        onTouchEnd={handleTouchEnd}
        onTouchStart={handleTouchStart}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--vl-text-faint)]">
              Pulse guide
            </p>
            <h2
              className="mt-1 text-xl font-bold tracking-normal text-[var(--vl-text)]"
              id="pulse-scan-guide-title"
            >
              How to scan
            </h2>
          </div>
          <button
            className="vl-glass-pill interactive-press min-h-9 px-3 text-xs font-bold text-[var(--vl-text-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--vl-peach)]"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,246,241,0.62))] shadow-[0_18px_44px_rgba(7,27,58,0.12)]">
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-white/60">
            {imageFailed ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
                <span
                  aria-hidden="true"
                  className="vl-glass-icon h-20 w-20 text-[var(--vl-peach-strong)]"
                >
                  <FallbackIcon className="h-10 w-10" />
                </span>
                <div>
                  <p className="text-lg font-bold text-[var(--vl-text)]">
                    {activeSlide.title}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[var(--vl-text-muted)]">
                    {activeSlide.body}
                  </p>
                </div>
              </div>
            ) : (
              <Image
                alt={activeSlide.imageAlt}
                className="h-full w-full object-contain"
                draggable={false}
                fill
                onError={handleImageError}
                sizes="(min-width: 640px) 430px, calc(100vw - 2rem)"
                src={activeSlide.imageSrc}
              />
            )}
          </div>
        </div>

        <div className="mt-4">
          <span className="vl-peach-pill inline-flex px-3 py-1 text-xs font-bold">
            {activeSlide.stepLabel}
          </span>
          <h3 className="mt-3 text-2xl font-bold leading-tight tracking-normal text-[var(--vl-text)]">
            {activeSlide.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--vl-text-muted)]">
            {activeSlide.body}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2" aria-label="Guide steps">
            {guideSlides.map((slide, index) => (
              <button
                aria-label={`Show ${slide.stepLabel}`}
                className={[
                  "h-2.5 rounded-full transition-all",
                  index === activeIndex
                    ? "w-7 bg-[var(--vl-peach)]"
                    : "w-2.5 bg-[rgba(10,39,74,0.18)]",
                ].join(" ")}
                key={slide.stepLabel}
                onClick={() => setActiveIndex(index)}
                type="button"
              />
            ))}
          </div>
          <span className="text-xs font-bold text-[var(--vl-text-faint)]">
            {activeIndex + 1} of {guideSlides.length}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-[0.85fr_1.15fr] gap-2.5">
          <Button
            className="min-h-12 w-full text-sm"
            disabled={isFirstSlide}
            onClick={goToPreviousSlide}
            variant="ghost"
          >
            Back
          </Button>
          <Button
            className="min-h-12 w-full text-sm"
            onClick={isLastSlide ? onClose : goToNextSlide}
          >
            {isLastSlide ? "Got it" : "Next"}
          </Button>
        </div>
      </section>
    </div>
  );
}
