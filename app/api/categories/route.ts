import { NextResponse } from "next/server";
import { mutateMenu, slugify, uniqueId, validateCategory } from "@/lib/menu-store";
import { isAdmin } from "@/lib/auth";
import type { Category } from "@/lib/types";

/** Admin: create a category (appended at the end). */
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json()) as Partial<Category>;
  const error = validateCategory(body, false);
  if (error) return NextResponse.json({ error }, { status: 400 });
  const created = await mutateMenu((data) => {
    const id = uniqueId(slugify(body.name!.en || "", "category"), new Set(data.categories.map((c) => c.id)));
    const category: Category = {
      id,
      name: { ar: body.name!.ar.trim(), en: body.name!.en.trim() },
      order: data.categories.length,
      coverImage: body.coverImage ?? "",
      items: [],
    };
    data.categories.push(category);
    return category;
  });
  return NextResponse.json(created, { status: 201 });
}

/** Admin: reorder categories. Body: { order: string[] } (category ids, in their new order). */
export async function PUT(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { order } = (await req.json()) as { order?: string[] };
  if (!Array.isArray(order)) return NextResponse.json({ error: "order must be an array of ids" }, { status: 400 });
  await mutateMenu((data) => {
    const rank = new Map(order.map((id, i) => [id, i]));
    data.categories.sort((a, b) => (rank.get(a.id) ?? 1e6) - (rank.get(b.id) ?? 1e6));
  });
  return NextResponse.json({ ok: true });
}
