import { QrGate } from "@/components/QrGate";
import { getMenu } from "@/lib/menu-store";
import { GENERAL_SCOPE, QR_DEMO_MODE, verifyQrToken } from "@/lib/qr-token";

export const dynamic = "force-dynamic";

/** `/?qr=<token>` opens the menu without a table (e.g. a QR at the entrance). Plain `/` shows the gate, unless QR_DEMO_MODE is on. */
export default async function HomePage({ searchParams }: { searchParams: Promise<{ qr?: string | string[] }> }) {
  const { qr } = await searchParams;
  const demo = QR_DEMO_MODE && !verifyQrToken(GENERAL_SCOPE, qr);
  const verified = demo || verifyQrToken(GENERAL_SCOPE, qr);
  return <QrGate verified={verified} demo={demo} table={null} initialMenu={verified ? await getMenu() : null} />;
}
