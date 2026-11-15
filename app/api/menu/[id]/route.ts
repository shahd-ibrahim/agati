import { NextResponse } from "next/server";
import { buildItem, findItem, mutateMenu, validateItem } from "@/lib/menu-store";
import { isAdmin } from "@/lib/auth";
import type { MenuItemInput } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

/** Admin: partial update (price, calories, availability, …). Pass `categoryId` to move the dish. */
export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json()) as MenuItemInput;
  delete body.id;
  const error = validateItem(body, true);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const result = await mutateMenu((data) => {
    const found = findItem(data, id);
    if (!found) return { status: 404 as const };
    const { categoryId, ...fields } = body;
    const updated = buildItem({ ...found.item, ...fields }, id);
    if (categoryId && categoryId !== found.category.id) {
      const target = data.categories.find((c) => c.id === categoryId);
      if (!target) return { status: 400 as const };
      found.category.items.splice(found.index, 1);
      target.items.push(updated);
    } else {
      found.category.items[found.index] = updated;
    }
    return { status: 200 as const, item: updated };
  });
  if (result.status === 404) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result.status === 400) return NextResponse.json({ error: "Unknown categoryId" }, { status: 400 });
  return NextResponse.json(result.item);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const removed = await mutateMenu((data) => {
    const found = findItem(data, id);
    if (found) found.category.items.splice(found.index, 1);
    return !!found;
  });
  if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
