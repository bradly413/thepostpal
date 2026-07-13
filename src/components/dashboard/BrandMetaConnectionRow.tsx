"use client";

import { buildMetaLoginUrl } from "@/lib/meta-connect-client";
import {
  disconnectDashboardMetaConnection,
  type LocationMetaSummaryRow,
} from "@/lib/dashboard-api";

export function BrandMetaConnectionRow({
  row,
  onChanged,
}: {
  row: LocationMetaSummaryRow;
  onChanged: () => void;
}) {
  const connected = Boolean(row.connection?.connected);
  const tokenExpired = Boolean(row.connection?.tokenExpired);

  async function handleDisconnect() {
    if (!confirm(`Disconnect Facebook and Instagram from ${row.locationName}?`)) return;
    await disconnectDashboardMetaConnection(row.locationId);
    onChanged();
  }

  return (
    <article className="pb-draft-card" style={{ alignItems: "flex-start" }}>
      <div className="flex-1 min-w-0 space-y-2">
        <p className="font-medium">{row.locationName}</p>
        {connected ? (
          <div className="space-y-1">
            {tokenExpired && (
              <p className="text-xs pb-press-text font-medium">
                Facebook session expired — scheduled posts for this brand will fail until you reconnect.
              </p>
            )}
            <p className="text-xs text-black/65">
              Facebook: <span className="font-medium text-black">{row.connection?.pageName}</span>
            </p>
            <p className="text-xs text-black/55">
              Instagram:{" "}
              {row.connection?.igAccountId ? "Business account linked" : "Not linked to this Page"}
            </p>
          </div>
        ) : (
          <p className="text-xs text-black/50">Not connected — connect Facebook for this brand.</p>
        )}
      </div>
      <div className="flex flex-col gap-2 shrink-0">
        {connected ? (
          <>
            {tokenExpired ? (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#ee2532]">
                Session expired
              </span>
            ) : (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#1f9d4d]">
                Connected
              </span>
            )}
            <button
              type="button"
              className={`${tokenExpired ? "pb-btn-primary" : "pb-btn-secondary"} text-xs py-2 px-3`}
              onClick={() => {
                window.location.href = buildMetaLoginUrl(row.locationId, "organization");
              }}
            >
              Reconnect
            </button>
            <button
              type="button"
              className="text-[11px] text-black/45 hover:text-[#ee2532]"
              onClick={() => void handleDisconnect()}
            >
              Disconnect
            </button>
          </>
        ) : (
          <button
            type="button"
            className="pb-btn-primary text-xs py-2 px-3"
            onClick={() => {
              window.location.href = buildMetaLoginUrl(row.locationId, "organization");
            }}
          >
            Connect
          </button>
        )}
      </div>
    </article>
  );
}
