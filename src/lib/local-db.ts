import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export type TableRow = {
  id: number; label: string; capacity: number; zone: string;
  adj_group: string; span: number; sort_order: number;
};
export type ReservationRow = {
  id: string; code: string; guest_name: string; phone: string;
  notes?: string | null; res_date: string; res_time: string;
  adults: number; children: number; table_ids: number[];
  status: string; created_at?: string;
};
export type AppSettings = {
  id: number; admin_pin: string; slot_duration_minutes: number; lead_time_minutes: number;
};
export type StaffRole = "dirigente" | "cuoco" | "cassiere" | "cameriere";
export type StaffUser = {
  id: string; username: string; password: string; name: string; role: StaffRole; active: boolean;
};
export type MenuItemRow = {
  id: string; section: string; name: string; price: number; desc: string; available: boolean;
};
export type OrderStatus = "pending" | "preparing" | "ready" | "served" | "paid" | "cancelled";
export type OrderItem = {
  id: string; tableId: number; tableLabel: string; dishId: string; dishName: string;
  basePrice: number; qty: number; mods: string; status: OrderStatus;
  createdAt: string; createdBy: string; readyAt?: string | null; paidAt?: string | null;
};
export type ChatMessage = {
  id: string; fromId: string; fromName: string; toId: string; text: string;
  createdAt: string; readBy: string[];
};
export type Solution = {
  id: string; title: string; description: string; price: string; active: boolean;
};

type DbShape = {
  settings: AppSettings;
  tables: TableRow[];
  reservations: ReservationRow[];
  staff: StaffUser[];
  menu: MenuItemRow[];
  orders: OrderItem[];
  messages: ChatMessage[];
  solutions: Solution[];
};

// Vercel/Lambda: only /tmp is writable (never process.cwd())
const DATA_DIR = join("/tmp", "campagnola-data");
const DB_PATH = join(DATA_DIR, "db.json");

const DEFAULT_TABLES: TableRow[] = [
  { id: 1, label: "T1", capacity: 2, zone: "Sala", adj_group: "A", span: 1, sort_order: 1 },
  { id: 2, label: "T2", capacity: 2, zone: "Sala", adj_group: "A", span: 1, sort_order: 2 },
  { id: 3, label: "T3", capacity: 4, zone: "Sala", adj_group: "B", span: 1, sort_order: 3 },
  { id: 4, label: "T4", capacity: 4, zone: "Sala", adj_group: "B", span: 1, sort_order: 4 },
  { id: 5, label: "T5", capacity: 6, zone: "Terrazza", adj_group: "C", span: 1, sort_order: 5 },
  { id: 6, label: "T6", capacity: 8, zone: "Terrazza", adj_group: "C", span: 1, sort_order: 6 },
];

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function defaultDb(): DbShape {
  return {
    settings: {
      id: 1,
      admin_pin: process.env["MANAGER_PIN"] || process.env["VITE_MANAGER_PIN"] || "1234",
      slot_duration_minutes: 120,
      lead_time_minutes: 0,
    },
    tables: DEFAULT_TABLES,
    reservations: [],
    staff: [],
    menu: [],
    orders: [],
    messages: [],
    solutions: [],
  };
}

function ensureDb(): DbShape {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.error("mkdir DATA_DIR failed", e);
  }
  if (!existsSync(DB_PATH)) {
    const db = defaultDb();
    try {
      writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    } catch (e) {
      console.error("write db failed", e);
    }
    return db;
  }
  try {
    const raw = JSON.parse(readFileSync(DB_PATH, "utf8")) as DbShape;
    return { ...defaultDb(), ...raw, settings: { ...defaultDb().settings, ...raw.settings } };
  } catch {
    return defaultDb();
  }
}

function saveDb(db: DbShape) {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error("local-db save failed", e);
  }
}

export function getSettings(): AppSettings {
  return ensureDb().settings;
}

export function getTables(): TableRow[] {
  return [...ensureDb().tables].sort((a, b) => a.sort_order - b.sort_order);
}

export function getReservationsForDate(date: string): ReservationRow[] {
  return ensureDb().reservations.filter((r) => r.res_date === date);
}

export function getAllReservationsInRange(from: string, to: string): ReservationRow[] {
  return ensureDb().reservations.filter((r) => r.res_date >= from && r.res_date <= to);
}

export function getReservationByCode(code: string): ReservationRow | undefined {
  return ensureDb().reservations.find((r) => r.code === code.toUpperCase());
}

export function insertReservation(
  input: Omit<ReservationRow, "id" | "created_at">,
): ReservationRow {
  const db = ensureDb();
  const row: ReservationRow = {
    ...input,
    code: input.code.toUpperCase(),
    id: uid("res"),
    created_at: new Date().toISOString(),
  };
  db.reservations.push(row);
  saveDb(db);
  return row;
}

export function updateReservation(
  code: string,
  patch: Partial<ReservationRow>,
): ReservationRow | null {
  const db = ensureDb();
  const idx = db.reservations.findIndex((r) => r.code === code.toUpperCase());
  if (idx < 0) return null;
  db.reservations[idx] = { ...db.reservations[idx]!, ...patch, code: db.reservations[idx]!.code };
  saveDb(db);
  return db.reservations[idx]!;
}

export function deleteReservation(code: string): boolean {
  const db = ensureDb();
  const before = db.reservations.length;
  db.reservations = db.reservations.filter((r) => r.code !== code.toUpperCase());
  saveDb(db);
  return db.reservations.length < before;
}

export function listStaff(): StaffUser[] {
  return ensureDb().staff.filter((s) => s.active);
}

export function listStaffFull(): StaffUser[] {
  return [...ensureDb().staff];
}

export function loginStaff(username: string, password: string): StaffUser | null {
  const u = ensureDb().staff.find(
    (s) => s.active && s.username.toLowerCase() === username.toLowerCase() && s.password === password,
  );
  return u ?? null;
}

export function createStaffUser(input: {
  username: string; password: string; name: string; role: StaffRole;
}): StaffUser {
  const db = ensureDb();
  if (db.staff.some((s) => s.username.toLowerCase() === input.username.toLowerCase())) {
    throw new Error("Username già esistente");
  }
  const row: StaffUser = {
    id: uid("st"),
    username: input.username,
    password: input.password,
    name: input.name,
    role: input.role,
    active: true,
  };
  db.staff.push(row);
  saveDb(db);
  return row;
}

export function setStaffActive(id: string, active: boolean): void {
  const db = ensureDb();
  const s = db.staff.find((x) => x.id === id);
  if (s) { s.active = active; saveDb(db); }
}

export function getMenuItems(): MenuItemRow[] {
  return [...ensureDb().menu];
}

export function saveMenuItems(items: MenuItemRow[]): void {
  const db = ensureDb();
  db.menu = items;
  saveDb(db);
}

export function upsertMenuItem(
  item: Partial<MenuItemRow> & { name: string; section: string },
): MenuItemRow {
  const db = ensureDb();
  if (item.id) {
    const idx = db.menu.findIndex((m) => m.id === item.id);
    if (idx >= 0) {
      db.menu[idx] = { ...db.menu[idx]!, ...item, id: item.id } as MenuItemRow;
      saveDb(db);
      return db.menu[idx]!;
    }
  }
  const row: MenuItemRow = {
    id: item.id ?? uid("mi"),
    section: item.section,
    name: item.name,
    price: item.price ?? 0,
    desc: item.desc ?? "",
    available: item.available ?? true,
  };
  db.menu.push(row);
  saveDb(db);
  return row;
}

export function deleteMenuItem(id: string): void {
  const db = ensureDb();
  db.menu = db.menu.filter((m) => m.id !== id);
  saveDb(db);
}

export function listOrders(filter?: {
  status?: OrderStatus | OrderStatus[];
  tableId?: number;
  openOnly?: boolean;
}): OrderItem[] {
  let list = [...ensureDb().orders];
  if (filter?.tableId != null) list = list.filter((o) => o.tableId === filter.tableId);
  if (filter?.openOnly) list = list.filter((o) => !["paid", "cancelled"].includes(o.status));
  if (filter?.status) {
    const set = new Set(Array.isArray(filter.status) ? filter.status : [filter.status]);
    list = list.filter((o) => set.has(o.status));
  }
  return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function addOrderItem(input: {
  tableId: number; tableLabel: string; dishId: string; dishName: string;
  basePrice: number; qty: number; mods: string; createdBy: string;
}): OrderItem {
  const db = ensureDb();
  const row: OrderItem = {
    id: uid("o"),
    tableId: input.tableId,
    tableLabel: input.tableLabel,
    dishId: input.dishId,
    dishName: input.dishName,
    basePrice: input.basePrice,
    qty: input.qty,
    mods: input.mods,
    status: "pending",
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
  };
  db.orders.push(row);
  saveDb(db);
  return row;
}

export function updateOrderStatus(id: string, status: OrderStatus): void {
  const db = ensureDb();
  const o = db.orders.find((x) => x.id === id);
  if (!o) return;
  o.status = status;
  if (status === "ready") o.readyAt = new Date().toISOString();
  if (status === "paid") o.paidAt = new Date().toISOString();
  saveDb(db);
}

export function markTablePaid(tableId: number): number {
  const db = ensureDb();
  let n = 0;
  const now = new Date().toISOString();
  for (const o of db.orders) {
    if (o.tableId === tableId && !["paid", "cancelled"].includes(o.status)) {
      o.status = "paid";
      o.paidAt = now;
      n += 1;
    }
  }
  saveDb(db);
  return n;
}

export function tableBill(tableId: number) {
  const open = listOrders({ tableId, openOnly: true });
  const total = open.reduce((s, o) => s + o.basePrice * o.qty, 0);
  return { items: open, total };
}

export function listMessages(forUserId: string): ChatMessage[] {
  return ensureDb()
    .messages.filter(
      (m) => m.toId === "all" || m.toId === forUserId || m.fromId === forUserId,
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function sendMessage(input: {
  fromId: string; fromName: string; toId: string; text: string;
}): ChatMessage {
  const db = ensureDb();
  const msg: ChatMessage = {
    id: uid("msg"),
    fromId: input.fromId,
    fromName: input.fromName,
    toId: input.toId,
    text: input.text.trim().slice(0, 1000),
    createdAt: new Date().toISOString(),
    readBy: [input.fromId],
  };
  db.messages.push(msg);
  saveDb(db);
  return msg;
}

export function weekSalesStats(days = 7) {
  const now = new Date();
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    dates.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }
  const paid = ensureDb().orders.filter((o) => o.status === "paid" && o.paidAt);
  const byDay = dates.map((date) => {
    const dayOrders = paid.filter((o) => (o.paidAt ?? "").slice(0, 10) === date);
    return {
      date,
      revenue: dayOrders.reduce((s, o) => s + o.basePrice * o.qty, 0),
      orders: dayOrders.length,
    };
  });
  return {
    byDay,
    topDishes: [] as { name: string; qty: number; revenue: number }[],
    totalRevenue: byDay.reduce((s, d) => s + d.revenue, 0),
    totalOrders: byDay.reduce((s, d) => s + d.orders, 0),
  };
}

export function listSolutions(activeOnly = false): Solution[] {
  const list = [...ensureDb().solutions];
  return activeOnly ? list.filter((s) => s.active) : list;
}

export function upsertSolution(input: {
  id?: string; title: string; description: string; price: string; active?: boolean;
}): Solution {
  const db = ensureDb();
  if (input.id) {
    const idx = db.solutions.findIndex((s) => s.id === input.id);
    if (idx >= 0) {
      db.solutions[idx] = {
        ...db.solutions[idx]!,
        title: input.title,
        description: input.description,
        price: input.price,
        active: input.active ?? db.solutions[idx]!.active,
      };
      saveDb(db);
      return db.solutions[idx]!;
    }
  }
  const row: Solution = {
    id: input.id ?? uid("sol"),
    title: input.title,
    description: input.description,
    price: input.price,
    active: input.active ?? true,
  };
  db.solutions.push(row);
  saveDb(db);
  return row;
}

export function deleteSolution(id: string): void {
  const db = ensureDb();
  db.solutions = db.solutions.filter((s) => s.id !== id);
  saveDb(db);
}
