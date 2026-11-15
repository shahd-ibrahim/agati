import { NextResponse } from "next/server";
import { mutateMenu, validateCategory } from "@/lib/menu-store";
import { isAdmin } from "@/lib/auth";
import type { Category } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

/** Admin: rename a category or change its cover image. */
export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json()) as Partial<Category>;
  const error = validateCategory(body, true);
  if (error) return NextResponse.json({ error }, { status: 400 });
  const updated = await mutateMenu((data) => {
    const c = data.categories.find((x) => x.id === id);
    if (!c) return null;
    if (body.name) c.name = { ar: body.name.ar.trim(), en: body.name.en.trim() };
    if (body.coverImage !== undefined) c.coverImage = body.coverImage.trim();
    return { ...c, items: undefined };
  });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

/** Admin: delete a category. Refuses while it still has dishes (move or delete them first). */
export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const result = await mutateMenu((data) => {
    const c = data.categories.find((x) => x.id === id);
    if (!c) return 404;
    if (c.items.length) return 409;
    data.categories = data.categories.filter((x) => x.id !== id);
    return 200;
  });
  if (result === 404) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result === 409) return NextResponse.json({ error: "Category still has dishes. Move or delete them first." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
