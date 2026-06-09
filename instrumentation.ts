import * as Sentry from "@sentry/nextjs";
import { getServerSentryOptions } from "./src/lib/sentry";

export function register() {
  Sentry.init(getServerSentryOptions());
}

export const onRequestError = Sentry.captureRequestError;
