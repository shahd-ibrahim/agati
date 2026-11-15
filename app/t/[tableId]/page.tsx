import { notFound } from "next/navigation";
import { QrGate } from "@/components/QrGate";
import { getMenu } from "@/lib/menu-store";
import { verifyQrToken } from "@/lib/qr-token";

export const dynamic = "force-dynamic";

/** `/t/12?token=<signed token>`: the URL printed in each table's QR code. */
export default async function TablePage({
  params,
  searchParams,
}: {
  params: Promise<{ tableId: string }>;
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { tableId } = await params;
  const { token } = await searchParams;
  if (!/^\d{1,4}$/.test(tableId) || Number(tableId) < 1) notFound();
  const table = String(Number(tableId));
  const verified = verifyQrToken(table, token);
  return <QrGate verified={verified} table={table} initialMenu={verified ? await getMenu() : null} />;
}
