import { QrGate } from "@/components/QrGate";
import { getMenu } from "@/lib/menu-store";
import { GENERAL_SCOPE, verifyQrToken } from "@/lib/qr-token";

export const dynamic = "force-dynamic";

/** `/?qr=<token>` opens the menu without a table (e.g. a QR at the entrance). Plain `/` shows the gate. */
export default async function HomePage({ searchParams }: { searchParams: Promise<{ qr?: string | string[] }> }) {
  const { qr } = await searchParams;
  const verified = verifyQrToken(GENERAL_SCOPE, qr);
  return <QrGate verified={verified} table={null} initialMenu={verified ? await getMenu() : null} />;
}
