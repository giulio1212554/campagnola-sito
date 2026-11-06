import { createMiddleware } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { getSettings, type StaffRole } from "./local-db";

export async function hashToken(token: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

/** Staff session via manager PIN cookie (no external auth). */
export const requireStaff = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const token = getCookie("campagnola_staff");
    if (!token) throw new Error("Accedi all'area personale");
    const settings = getSettings();
    if ((await hashToken(settings.admin_pin)) !== token) {
      throw new Error("Sessione scaduta");
    }
    return next({
      context: {
        staff: {
          id: null as string | null,
          name: "Gestore",
          role: "dirigente" as StaffRole,
        },
      },
    });
  },
);
