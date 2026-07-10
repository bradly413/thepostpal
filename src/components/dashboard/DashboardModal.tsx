"use client";

import { useRef, type ReactNode } from "react";
import { useFocusTrap } from "@/components/dashboard/use-focus-trap";

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
  className = "w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-2xl",
}: DashboardModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(open, ref, onClose);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={className}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
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
