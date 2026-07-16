"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useFocusTrap } from "@/components/dashboard/use-focus-trap";

export type RadialPostAction = "preview" | "edit" | "cancel";

interface CalendarPostRadialMenuProps {
  open: boolean;
  x: number;
  y: number;
  onClose: () => void;
  onAction: (action: RadialPostAction) => void;
}

const ACTIONS: {
  id: RadialPostAction;
  label: string;
  icon: typeof Eye;
  tone: "neutral" | "danger";
}[] = [
  { id: "preview", label: "Preview", icon: Eye, tone: "neutral" },
  { id: "edit", label: "Edit", icon: Pencil, tone: "neutral" },
  { id: "cancel", label: "Cancel post", icon: Trash2, tone: "neutral" },
];

/**
 * Circle / radial action menu (CSS-only animation pattern) for calendar post thumbs.
 */
export default function CalendarPostRadialMenu({
  open,
  x,
  y,
  onClose,
  onAction,
}: CalendarPostRadialMenuProps) {
  const [expanded, setExpanded] = useState(false);
  const menuRef = useRef<HTMLElement>(null);

  useFocusTrap(open && expanded, menuRef, onClose);

  useEffect(() => {
    if (!open) {
      setExpanded(false);
      return;
    }
    const id = window.requestAnimationFrame(() => setExpanded(true));
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  if (!open) return null;

  const n = ACTIONS.length;

  return (
    <div className="pb-radial" role="presentation">
      <button
        type="button"
        className="pb-radial__backdrop"
        aria-label="Close menu"
        onClick={onClose}
      />
      <nav
        ref={menuRef}
        className={`pb-radial__menu${expanded ? " is-open" : ""}`}
        style={{ left: x, top: y }}
        aria-label="Post actions"
        role="menu"
      >
        <button
          type="button"
          className="pb-radial__toggler"
          aria-label="Close"
          onClick={onClose}
        >
          <span className="pb-radial__toggler-bar" />
          <span className="pb-radial__toggler-bar" />
        </button>
        <ul className="pb-radial__list" style={{ ["--n" as string]: n }}>
          {ACTIONS.map((action, i) => {
            const Icon = action.icon;
            return (
              <li
                key={action.id}
                className="pb-radial__item"
                style={{ ["--i" as string]: i }}
                role="none"
              >
                <button
                  type="button"
                  role="menuitem"
                  title={action.label}
                  aria-label={action.label}
                  className={`pb-radial__action pb-radial__action--${action.tone}`}
                  onClick={() => onAction(action.id)}
                >
                  <Icon size={18} strokeWidth={2.25} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
