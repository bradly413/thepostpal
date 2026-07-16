"use client";

import { useRef, type ReactNode } from "react";
import { AnimatedOverlay } from "@/components/dashboard/AnimatedOverlay";

interface DashboardModalProps {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: ReactNode;
  className?: string;
}

export function DashboardModal({
  open,
  onClose,
  ariaLabel,
  children,
  // Phone: bottom sheet (safe-area padded, top-rounded); sm+: centered card —
  // the same pattern the calendar modals already use.
  className = "pb-safe-sheet relative w-full max-w-md max-h-[85dvh] overflow-y-auto rounded-t-2xl border border-black/10 bg-white p-6 shadow-2xl sm:rounded-2xl",
}: DashboardModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <AnimatedOverlay
      open={open}
      onClose={onClose}
      ariaLabel={ariaLabel}
      align="bottom"
      zIndexClass="z-50"
      backdropClassName="bg-black/55 backdrop-blur-sm"
      panelClassName={className}
      panelRef={ref}
    >
      {children}
    </AnimatedOverlay>
  );
}

interface DashboardConfirmProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DashboardConfirm({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: DashboardConfirmProps) {
  return (
    <DashboardModal open={open} onClose={onCancel} ariaLabel={title}>
      <h3 className="text-lg font-semibold text-[#1c1c1e]">{title}</h3>
      <p className="mt-2 text-sm text-[#6b6b6b]">{message}</p>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          className="pb-btn-secondary flex-1 text-sm py-2.5"
          onClick={onCancel}
          disabled={busy}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`flex-1 rounded-full px-5 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-50 ${
            destructive ? "bg-[#ee2532] hover:opacity-90" : "pb-btn-primary"
          }`}
          onClick={onConfirm}
          disabled={busy}
        >
          {confirmLabel}
        </button>
      </div>
    </DashboardModal>
  );
}
