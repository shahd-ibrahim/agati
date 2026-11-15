import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * QR access tokens. Each table QR carries an HMAC of its table number, so a guest
 * can't open the menu by typing the URL, and can't change `/t/5` into `/t/9`
 * without the matching token. `GENERAL_SCOPE` covers the table-less `/?qr=…` code.
 *
 * Changing QR_SECRET invalidates every printed QR code.
 */
export const GENERAL_SCOPE = "menu";

/**
 * DEMO MODE (temporary): the root URL `/` opens the menu without a QR token.
 * To re-enable the QR-only lock, set `QR_DEMO_MODE=false` in the environment (or flip the
 * default below to `=== "true"`). Table links `/t/[id]?token=…` and `/qr-generator` are
 * unaffected: table tokens are always verified.
 */
export const QR_DEMO_MODE = process.env.QR_DEMO_MODE !== "false";

const secret = () => process.env.QR_SECRET || process.env.ADMIN_SECRET || "aghatti-qr-dev-secret";

export function qrToken(scope: string) {
  return createHmac("sha256", secret()).update(`qr:${scope}`).digest("base64url").slice(0, 22);
}

export function verifyQrToken(scope: string, token: string | string[] | undefined) {
  if (typeof token !== "string" || !token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(qrToken(scope));
  return a.length === b.length && timingSafeEqual(a, b);
}
