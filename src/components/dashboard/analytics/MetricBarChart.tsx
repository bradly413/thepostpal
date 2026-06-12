"use client";

import type { InsightDayPoint } from "@/lib/meta-insights-types";

interface Props {
  title: string;
  points: InsightDayPoint[];
  color?: string;
}

function formatLabel(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function MetricBarChart({ title, points, color = "#ee2532" }: Props) {
  const slice = points.slice(-14);
  const max = Math.max(1, ...slice.map((p) => p.value));

  if (slice.length === 0) {
    return (
      <div className="pb-metric-chart pb-panel">
        <h3 className="pb-panel-h">{title}</h3>
        <p className="text-sm opacity-50 mt-2">No data for this period yet.</p>
      </div>
    );
  }

  return (
    <div className="pb-metric-chart pb-panel">
      <h3 className="pb-panel-h">{title}</h3>
      <div className="pb-metric-chart-bars">
        {slice.map((p) => (
          <div key={p.date} className="pb-metric-bar-col" title={`${formatLabel(p.date)}: ${p.value.toLocaleString()}`}>
            <div
              className="pb-metric-bar"
              style={{
                height: `${Math.max(4, (p.value / max) * 100)}%`,
                background: color,
              }}
            />
            <span className="pb-metric-bar-label">{formatLabel(p.date)}</span>
          </div>
        ))}
      </div>
      <style>{`
        .pb-metric-chart-bars {
          display: flex; align-items: flex-end; gap: 6px;
          height: 140px; margin-top: 12px; padding-top: 4px;
        }
        .pb-metric-bar-col {
          flex: 1; display: flex; flex-direction: column; align-items: center;
          height: 100%; min-width: 0;
        }
        .pb-metric-bar {
          width: 100%; max-width: 28px; border-radius: 6px 6px 2px 2px;
          opacity: 0.88; transition: var(--transition-opacity);
        }
        .pb-metric-bar-col:hover .pb-metric-bar { opacity: 1; }
        .pb-metric-bar-label {
          font-size: var(--text-eyebrow); opacity: 0.45; margin-top: 6px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          max-width: 100%; transform: rotate(-35deg); transform-origin: top center;
        }
      `}</style>
    </div>
  );
}
