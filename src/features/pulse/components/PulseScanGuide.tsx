"use client";

import { useEffect, useState, type TouchEvent } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/shared/components/Button";
import {
  CameraIcon,
  FingerTapIcon,
  ScanPlayIcon,
} from "@/shared/components/LineIcons";

type PulseScanGuideProps = {
  onClose: () => void;
};

const AUTO_ADVANCE_MS = 4200;
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

  useEffect(() => {
    const advanceTimerId = window.setTimeout(() => {
      setActiveIndex((currentIndex) =>
        (currentIndex + 1) % guideSlides.length,
      );
    }, AUTO_ADVANCE_MS);

    return () => {
      window.clearTimeout(advanceTimerId);
    };
  }, [activeIndex]);

  function goToPreviousSlide() {
    setActiveIndex(
      (currentIndex) =>
        (currentIndex - 1 + guideSlides.length) % guideSlides.length,
    );
  }

  function goToNextSlide() {
    setActiveIndex((currentIndex) =>
      (currentIndex + 1) % guideSlides.length,
    );
  }

  function handleImageError(imageIndex: number) {
    setFailedImageIndexes((currentIndexes) =>
      currentIndexes.includes(imageIndex)
        ? currentIndexes
        : [...currentIndexes, imageIndex],
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

  const guideDialog = (
    <div
      aria-labelledby="pulse-scan-guide-title"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex h-[100dvh] w-screen items-center justify-center overflow-hidden overscroll-contain bg-[rgba(7,27,58,0.38)] px-4"
      role="dialog"
      style={{
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
        paddingTop: "max(1rem, env(safe-area-inset-top))",
      }}
    >
      <button
        aria-label="Close scan guide"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
        type="button"
      />

      <section
        className="animate-card-in relative z-10 flex w-[min(92vw,390px)] max-h-[min(82dvh,680px)] -translate-y-[2dvh] flex-col overflow-hidden rounded-[34px] border border-white/70 bg-white/82 p-3 shadow-[0_24px_80px_rgba(7,27,58,0.22),0_10px_28px_rgba(244,124,98,0.10),inset_0_1px_0_rgba(255,255,255,0.92)]"
        onTouchEnd={handleTouchEnd}
        onTouchStart={handleTouchStart}
      >
        <div className="flex items-center justify-between gap-3">
          <h2
            className="px-1 text-base font-bold tracking-normal text-[var(--vl-text)]"
            id="pulse-scan-guide-title"
          >
            How to scan
          </h2>
        </div>

        <div className="mt-3 grid max-h-[min(70dvh,520px)] w-full overflow-hidden rounded-[30px]">
          {guideSlides.map((slide, index) => {
            const FallbackIcon = slide.FallbackIcon;
            const isActive = index === activeIndex;
            const imageFailed = failedImageIndexes.includes(index);

            return (
              <div
                aria-hidden={!isActive}
                className={[
                  "col-start-1 row-start-1 flex min-h-0 items-center justify-center transition duration-700 ease-out",
                  isActive
                    ? "translate-x-0 opacity-100"
                    : index < activeIndex
                      ? "-translate-x-2 opacity-0"
                      : "translate-x-2 opacity-0",
                ].join(" ")}
                key={slide.stepLabel}
              >
                {imageFailed ? (
                  <div className="flex aspect-[0.82] max-h-[min(70dvh,520px)] w-full flex-col items-center justify-center gap-4 rounded-[30px] bg-white/65 px-8 text-center shadow-[0_14px_42px_rgba(7,27,58,0.12)]">
                    <span
                      aria-hidden="true"
                      className="vl-glass-icon h-20 w-20 text-[var(--vl-peach-strong)]"
                    >
                      <FallbackIcon className="h-10 w-10" />
                    </span>
                    <div>
                      <span className="vl-peach-pill inline-flex px-3 py-1 text-xs font-bold">
                        {slide.stepLabel}
                      </span>
                      <p className="mt-3 text-lg font-bold text-[var(--vl-text)]">
                        {slide.title}
                      </p>
                    </div>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={isActive ? slide.imageAlt : ""}
                    className="block h-auto max-h-[min(70dvh,520px)] w-full rounded-[30px] object-contain shadow-[0_16px_46px_rgba(7,27,58,0.14)]"
                    draggable={false}
                    onError={() => handleImageError(index)}
                    src={slide.imageSrc}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-center gap-3">
          <div className="flex items-center gap-2.5" aria-label="Guide steps">
            {guideSlides.map((slide, index) => (
              <button
                aria-label={`Show ${slide.stepLabel}`}
                className={[
                  "h-2.5 rounded-full transition-all duration-300",
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
        </div>

        <div className="mt-3">
          <Button className="min-h-12 w-full text-sm" onClick={onClose}>
            Got it
          </Button>
        </div>
      </section>
    </div>
  );

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(guideDialog, document.body);
}
