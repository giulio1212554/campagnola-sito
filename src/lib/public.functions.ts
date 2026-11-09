import { createServerFn } from "@tanstack/react-start";
import { MENU, dishEn } from "./menu";
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
    const section = MENU.find((s) => s.id === d.section);
    const original = section?.dishes.find((x) => x.name === d.name);
    const en = dishEn(d.name);
    return {
      id: d.id,
      category: d.section,
      name: d.name,
      name_en: original?.nameEn ?? en.nameEn,
      description: d.desc || original?.desc || "",
      description_en: original?.descEn ?? en.descEn ?? d.desc ?? "",
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
