import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireStaff } from "./staff-middleware";
import {
  getTables,
  getMenuItems,
  listOrders,
  listMessages,
  listStaffFull,
  listSolutions,
  addOrderItem,
  updateOrderStatus,
  markTablePaid,
  upsertMenuItem,
  createStaffUser,
  sendMessage as dbSendMessage,
  weekSalesStats,
  upsertSolution,
  type OrderStatus,
} from "./local-db";
import { MENU } from "./menu";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function ensureMenuSeeded() {
  let items = getMenuItems();
  if (items.length) return items;
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
  return getMenuItems();
}

export const staffData = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d: unknown) => z.object({ date: dateSchema }).parse(d))
  .handler(async ({ data }) => {
    const tables = getTables().map((t) => ({
      id: String(t.id),
      label: t.label,
      capacity: t.capacity,
      zone: t.zone,
      active: true,
    }));

    const menu = ensureMenuSeeded().map((m) => ({
      id: m.id,
      category: m.section,
      name: m.name,
      name_en: m.name,
      description: m.desc,
      description_en: m.desc,
      price: m.price,
      allergens: null as string[] | null,
      available: m.available,
    }));

    const orders = listOrders().map((o) => ({
      id: o.id,
      table_id: String(o.tableId),
      dish_name: o.dishName,
      unit_price: o.basePrice,
      quantity: o.qty,
      notes: o.mods,
      status: o.status === "pending" ? "queued" : o.status,
      service_date: (o.createdAt ?? "").slice(0, 10),
      paid_at: o.paidAt ?? null,
      payment_method: null as string | null,
    }));

    const messages = listMessages("all").map((m) => ({
      id: m.id,
      body: m.text,
      sender_id: m.fromId,
      sender_name: m.fromName,
      recipient_id: m.toId === "all" ? null : m.toId,
      created_at: m.createdAt,
    }));

    const team = listStaffFull().map((s) => ({
      id: s.id,
      email: s.username,
      display_name: s.name,
      role: s.role,
      active: s.active,
    }));

    const offers = listSolutions().map((s) => ({
      id: s.id,
      title: s.title,
      title_en: s.title,
      description: s.description,
      description_en: s.description,
      price: s.price ? Number(String(s.price).replace(",", ".")) : null,
      active: s.active,
    }));

    const sales = weekSalesStats(7);
    void data;

    return { tables, menu, orders, messages, team, offers, sales };
  });

export const saveTable = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().optional(),
      label: z.string().trim().min(1).max(40),
      capacity: z.number().int().min(1).max(30),
      zone: z.string().trim().min(1).max(40),
      active: z.boolean(),
    }).parse(d),
  )
  .handler(async () => ({ ok: true }));

export const saveMenu = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().optional(),
      category: z.string(),
      name: z.string().trim().min(1).max(100),
      name_en: z.string().optional(),
      description: z.string().max(500).optional(),
      description_en: z.string().max(500).optional(),
      price: z.number().min(0).max(9999),
      allergens: z.array(z.string()).nullable().optional(),
      available: z.boolean(),
    }).parse(d),
  )
  .handler(async () => ({ ok: true, ghost: true }));

export const addOrder = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d: unknown) =>
    z.object({
      table_id: z.string(),
      menu_id: z.string(),
      quantity: z.number().int().min(1).max(99),
      notes: z.string().max(300).optional(),
      service_date: dateSchema.optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const tableId = Number(data.table_id);
    const table = getTables().find((t) => t.id === tableId);
    if (!table) throw new Error("Tavolo non disponibile");
    const item = ensureMenuSeeded().find((m) => m.id === data.menu_id);
    if (!item || !item.available) throw new Error("Piatto non disponibile");
    const row = addOrderItem({
      tableId,
      tableLabel: table.label,
      dishId: item.id,
      dishName: item.name,
      basePrice: item.price,
      qty: data.quantity,
      mods: data.notes ?? "",
      createdBy: context.staff.name ?? "staff",
    });
    return {
      ok: true,
      order: {
        id: row.id,
        table_id: String(row.tableId),
        dish_name: row.dishName,
        status: row.status,
        notes: row.mods,
      },
    };
  });

export const orderStatus = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string(),
      status: z.enum(["queued","preparing","ready","served","cancelled","pending","paid"]),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const map: Record<string, OrderStatus> = {
      queued: "pending",
      pending: "pending",
      preparing: "preparing",
      ready: "ready",
      served: "served",
      cancelled: "cancelled",
      paid: "paid",
    };
    updateOrderStatus(data.id, map[data.status] ?? "pending");
    return { ok: true };
  });

export const payTable = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d: unknown) =>
    z.object({
      table: z.string(),
      date: dateSchema.optional(),
      method: z.enum(["Contanti", "Carta"]).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    markTablePaid(Number(data.table));
    return { ok: true };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d: unknown) =>
    z.object({
      body: z.string().trim().min(1).max(1000),
      recipient_id: z.string().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    dbSendMessage({
      fromId: context.staff.id ?? "manager",
      fromName: context.staff.name,
      toId: data.recipient_id ?? "all",
      text: data.body,
    });
    return { ok: true };
  });

export const saveStaff = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d: unknown) =>
    z.object({
      email: z.string().email().transform((v) => v.toLowerCase()),
      display_name: z.string().trim().min(2).max(80),
      role: z.enum(["dirigente", "cuoco", "cassiere", "cameriere"]),
      active: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    createStaffUser({
      username: data.email,
      password: "change-me",
      name: data.display_name,
      role: data.role,
    });
    return { ok: true };
  });

export const saveOffer = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().optional(),
      title: z.string().trim().min(1).max(100),
      title_en: z.string().optional(),
      description: z.string().max(500).optional(),
      description_en: z.string().max(500).optional(),
      price: z.number().min(0).nullable().optional(),
      active: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    upsertSolution({
      id: data.id,
      title: data.title,
      description: data.description ?? "",
      price: data.price != null ? String(data.price) : "",
      active: data.active,
    });
    return { ok: true };
  });

export const removeItem = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d: unknown) =>
    z.object({
      kind: z.enum(["menu_items", "offers", "reservations"]),
      id: z.string(),
    }).parse(d),
  )
  .handler(async () => ({ ok: true, ghost: true }));

export const editReservation = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string(),
      name: z.string().trim().min(2),
      phone: z.string().trim().min(6),
      guests: z.number().int().min(1).max(12),
      notes: z.string().max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { getAllReservationsInRange, updateReservation } = await import("./local-db");
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const to = new Date();
    to.setDate(to.getDate() + 60);
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const rows = getAllReservationsInRange(iso(from), iso(to));
    const row = rows.find((r) => r.id === data.id || r.code === data.id);
    if (!row) throw new Error("Prenotazione non trovata");
    updateReservation(row.code, {
      guest_name: data.name,
      phone: data.phone,
      adults: data.guests,
      children: 0,
      notes: data.notes ?? null,
    });
    return { ok: true };
  });
