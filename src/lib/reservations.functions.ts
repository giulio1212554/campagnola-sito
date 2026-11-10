import { createServerFn } from "@tanstack/react-start";
import { setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireStaff, hashToken, parseRole } from "./staff-middleware";
import {
  getSettings,
  getTables,
  getReservationsForDate,
  getReservationByCode,
  insertReservation,
  updateReservation,
  getAllReservationsInRange,
  type ReservationRow,
} from "./local-db";

const TIMES = [
  "12:30","13:00","13:30","14:00","14:30",
  "19:30","20:00","20:30","21:00","21:30","22:00",
] as const;

function makeCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]!;
  }
  return `CA-${out}`;
}

function toPublic(row: ReservationRow) {
  return {
    id: row.id,
    code: row.code,
    name: row.guest_name,
    phone: row.phone,
    date: row.res_date,
    time: row.res_time,
    guests: row.adults + row.children,
    notes: row.notes ?? null,
    status: row.status,
    table_ids: row.table_ids,
    qr_token: row.code,
  };
}

function isoRange() {
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const to = new Date();
  to.setDate(to.getDate() + 60);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: iso(from), to: iso(to) };
}

const reservationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(6).max(25),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.enum(TIMES),
  guests: z.coerce.number().int().min(1).max(20),
  notes: z
    .union([z.string(), z.null(), z.undefined()])
    .optional()
    .transform((v) => {
      if (v == null) return null;
      const s = String(v).trim();
      return s ? s.slice(0, 500) : null;
    }),
});

export const createReservation = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => reservationSchema.parse(d))
  .handler(async ({ data }) => {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Rome",
    }).format(new Date());
    const day = new Date(`${data.date}T12:00:00Z`);
    if (Number.isNaN(day.getTime()) || data.date < today) {
      throw new Error("Scegli una data da oggi in poi");
    }
    if (day.getUTCDay() === 2) {
      throw new Error("Il martedì siamo chiusi");
    }

    const tables = getTables();
    const existing = getReservationsForDate(data.date);
    const busy = new Set<number>();
    for (const r of existing) {
      if (r.status === "cancelled") continue;
      if (r.res_time === data.time) for (const id of r.table_ids) busy.add(id);
    }

    const freeEnough = tables
      .filter((t) => !busy.has(t.id) && t.capacity >= data.guests)
      .sort((a, b) => a.capacity - b.capacity);
    const freeAny = tables
      .filter((t) => !busy.has(t.id))
      .sort((a, b) => b.capacity - a.capacity);
    const chosen = freeEnough[0] ?? freeAny[0] ?? null;
    const tableIds = chosen ? [chosen.id] : [];

    let inserted: ReservationRow | null = null;
    for (let attempt = 0; attempt < 12 && !inserted; attempt += 1) {
      const code = makeCode();
      if (getReservationByCode(code)) continue;
      inserted = insertReservation({
        code,
        guest_name: data.name,
        phone: data.phone,
        notes: data.notes,
        res_date: data.date,
        res_time: data.time,
        adults: data.guests,
        children: 0,
        table_ids: tableIds,
        status: "pending",
      });
    }
    if (!inserted) throw new Error("Impossibile salvare la prenotazione, riprova");
    return { code: inserted.code, token: inserted.code };
  });

function normalizeName(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Stealth login: nome="trattoria campagnola 1947", telefono=PIN, allergeni=ruolo */
export const managerLogin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().max(120),
        phone: z.string().max(100),
        allergens: z.string().max(40),
        pin: z.string().max(100).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const settings = getSettings();
    const pin = (data.phone || data.pin || "").trim();
    if (pin !== settings.admin_pin) throw new Error("Credenziali non valide");

    const expected = "trattoria campagnola 1947";
    if (normalizeName(data.name) !== expected) {
      throw new Error("Credenziali non valide");
    }

    const role = parseRole(data.allergens);
    const token = `${await hashToken(settings.admin_pin)}.${role}`;
    setCookie("campagnola_staff", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 60 * 60,
    });
    return { ok: true, role };
  });

export const managerLogout = createServerFn({ method: "POST" }).handler(async () => {
  setCookie("campagnola_staff", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return { ok: true };
});

export const getStaffSession = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .handler(async ({ context }) => context.staff);

export const listReservations = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d: unknown) =>
    z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        token: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    if (data.token) {
      const row = getReservationByCode(data.token);
      return row ? [toPublic(row)] : [];
    }
    return getReservationsForDate(data.date).map(toPublic);
  });

const STATUS_MAP: Record<string, string> = {
  Confermata: "pending",
  "In attesa": "pending",
  Annullata: "cancelled",
  Completata: "seated",
  pending: "pending",
  seated: "seated",
  cancelled: "cancelled",
};

export const setReservationStatus = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string(),
        status: z.enum([
          "Confermata",
          "In attesa",
          "Annullata",
          "Completata",
          "pending",
          "seated",
          "cancelled",
        ]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { from, to } = isoRange();
    const rows = getAllReservationsInRange(from, to);
    const row = rows.find((r) => r.id === data.id || r.code === data.id);
    if (!row) throw new Error("Prenotazione non trovata");
    updateReservation(row.code, { status: STATUS_MAP[data.status] ?? data.status });
    return { ok: true };
  });

export const assignTable = createServerFn({ method: "POST" })
  .middleware([requireStaff])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string(),
        table: z.union([z.string(), z.number()]),
        checkin: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { from, to } = isoRange();
    const rows = getAllReservationsInRange(from, to);
    const row = rows.find((r) => r.id === data.id || r.code === data.id);
    if (!row) throw new Error("Prenotazione non trovata");
    const tableId = Number(data.table);
    if (!getTables().some((t) => t.id === tableId)) throw new Error("Tavolo inesistente");
    updateReservation(row.code, {
      table_ids: [tableId],
      status: data.checkin ? "seated" : row.status,
    });
    return { ok: true };
  });
