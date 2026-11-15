import { redirect } from "next/navigation";
import { QrGenerator } from "@/components/QrGenerator";
import { isAdmin } from "@/lib/auth";
import { GENERAL_SCOPE, qrToken } from "@/lib/qr-token";

export const dynamic = "force-dynamic";

const MAX_TABLE = 200;

/** Admin only: the page hands out valid access tokens. */
export default async function QrGeneratorPage() {
  if (!(await isAdmin())) redirect("/admin?next=/qr-generator");
  const tokens = Object.fromEntries(Array.from({ length: MAX_TABLE }, (_, i) => [String(i + 1), qrToken(String(i + 1))]));
  return <QrGenerator tokens={tokens} generalToken={qrToken(GENERAL_SCOPE)} maxTable={MAX_TABLE} />;
}
