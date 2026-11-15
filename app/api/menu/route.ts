import { NextResponse } from "next/server";
import { allItemIds, buildItem, getMenu, mutateMenu, slugify, uniqueId, validateItem } from "@/lib/menu-store";
import { isAdmin } from "@/lib/auth";
import type { MenuItemInput } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Public: the full menu, categories with their items. */
export async function GET() {
  const menu = await getMenu();
  return NextResponse.json(menu, { headers: { "Cache-Control": "no-store" } });
}

/** Admin: create one dish. Body: item fields + `categoryId`. */
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json()) as MenuItemInput;
  const error = validateItem(body, false);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const result = await mutateMenu((data) => {
    const category = data.categories.find((c) => c.id === body.categoryId);
    if (!category) return null;
    const item = buildItem(body, uniqueId(slugify(body.name?.en || ""), allItemIds(data)));
    category.items.push(item);
    return item;
  });
  if (!result) return NextResponse.json({ error: "Unknown categoryId" }, { status: 400 });
  return NextResponse.json(result, { status: 201 });
}
