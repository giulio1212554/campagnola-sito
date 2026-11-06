import { createMiddleware } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { getSettings, type StaffRole } from "./local-db";

const ROLES: StaffRole[] = ["dirigente", "cuoco", "cassiere", "cameriere"];

export async function hashToken(token: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

export function parseRole(raw: string | undefined | null): StaffRole {
  const r = (raw ?? "").trim().toLowerCase();
  return ROLES.includes(r as StaffRole) ? (r as StaffRole) : "dirigente";
}

/** Cookie format: `${sha256(pin)}.${role}` */
export const requireStaff = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const cookie = getCookie("campagnola_staff");
    if (!cookie) throw new Error("Accedi all'area personale");
    const [hash, roleRaw] = cookie.split(".");
    if (!hash) throw new Error("Sessione scaduta");
    const settings = getSettings();
    if ((await hashToken(settings.admin_pin)) !== hash) {
      throw new Error("Sessione scaduta");
    }
    const role = parseRole(roleRaw);
    return next({
      context: {
        staff: {
          id: null as string | null,
          name: role === "dirigente" ? "Gestore" : role,
          role,
        },
      },
    });
  },
);
