import { NextResponse } from "next/server";
import { checkPassword, cookieOptions, createToken, isAdmin, SESSION_COOKIE } from "@/lib/auth";
import { GENERAL_SCOPE, qrToken } from "@/lib/qr-token";

export async function GET() {
  const authenticated = await isAdmin();
  // Signed link so staff can preview the gated menu from the dashboard.
  return NextResponse.json(authenticated ? { authenticated, menuUrl: `/?qr=${qrToken(GENERAL_SCOPE)}` } : { authenticated });
}

/** Log in. */
export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!password || !checkPassword(password)) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }
  const res = NextResponse.json({ authenticated: true });
  res.cookies.set(SESSION_COOKIE, createToken(), cookieOptions);
  return res;
}

/** Log out. */
export async function DELETE() {
  const res = NextResponse.json({ authenticated: false });
  res.cookies.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return res;
}
