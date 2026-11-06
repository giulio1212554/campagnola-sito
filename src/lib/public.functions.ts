import { createServerFn } from "@tanstack/react-start";
import { MENU, EN } from "./menu";
import { getMenuItems, listSolutions, upsertMenuItem } from "./local-db";

export const publicMenu = createServerFn({ method: "GET" }).handler(async () => {
  let items = getMenuItems();
  if (!items.length) {
    for (const section of MENU) {
      for (const dish of section.dishes) {
        const price = Number(String(dish.price).replace(",", "."));
        upsertMenuItem({
          section: section.id,
          name: dish.name,
          price: Number.isFinite(price) ? price : 0,
          desc: dish.desc ?? "",
          available: true,
        });
      }
    }
    items = getMenuItems();
  }

  const mapped = items.map((d) => {
    const original = MENU.find((s) => s.id === d.section)?.dishes.find((x) => x.name === d.name);
    return {
      id: d.id,
      category: d.section,
      name: d.name,
      name_en: d.name,
      description: d.desc || original?.desc || "",
      description_en: d.desc || (original?.desc ? EN[original.desc] ?? original.desc : "") || "",
      price: d.price,
      allergens: null as string[] | null,
      available: d.available,
    };
  });

  const offers = listSolutions(true).map((s) => ({
    id: s.id,
    title: s.title,
    title_en: s.title,
    description: s.description,
    description_en: s.description,
    price: s.price ? Number(String(s.price).replace(",", ".")) : null,
    active: s.active,
  }));

  return { items: mapped, offers };
});
