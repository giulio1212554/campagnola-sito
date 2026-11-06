import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  managerLogin,
  managerLogout,
  getStaffSession,
  listReservations,
  setReservationStatus,
  assignTable,
} from "@/lib/reservations.functions";
import {
  staffData,
  addOrder,
  orderStatus,
  payTable,
  saveStaff,
  saveOffer,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Campagnola" }] }),
  component: AdminPage,
});

function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
}

type Tab = "prenotazioni" | "sala" | "cucina" | "conti" | "menu" | "team" | "offerte";

function AdminPage() {
  const qc = useQueryClient();
  const [pin, setPin] = useState("");
  const [date, setDate] = useState(todayISO());
  const [tab, setTab] = useState<Tab>("prenotazioni");
  const [error, setError] = useState<string | null>(null);

  const session = useQuery({
    queryKey: ["staff-session"],
    queryFn: () => getStaffSession(),
    retry: false,
  });

  const login = useMutation({
    mutationFn: () => managerLogin({ data: { pin } }),
    onSuccess: () => {
      setError(null);
      qc.invalidateQueries({ queryKey: ["staff-session"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const logout = useMutation({
    mutationFn: () => managerLogout(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff-session"] }),
  });

  const reservations = useQuery({
    queryKey: ["reservations", date],
    queryFn: () => listReservations({ data: { date } }),
    enabled: !!session.data,
  });

  const data = useQuery({
    queryKey: ["staff-data", date],
    queryFn: () => staffData({ data: { date } }),
    enabled: !!session.data,
  });

  const statusMut = useMutation({
    mutationFn: (p: { id: string; status: "Confermata" | "In attesa" | "Annullata" | "Completata" }) =>
      setReservationStatus({ data: p }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reservations", date] }),
  });

  const assignMut = useMutation({
    mutationFn: (p: { id: string; table: string; checkin: boolean }) => assignTable({ data: p }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations", date] });
      qc.invalidateQueries({ queryKey: ["staff-data", date] });
    },
  });

  const payMut = useMutation({
    mutationFn: (p: { table: string; method: "Contanti" | "Carta" }) =>
      payTable({ data: { table: p.table, date, method: p.method } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff-data", date] }),
  });

  const orderStatusMut = useMutation({
    mutationFn: (p: { id: string; status: "queued" | "preparing" | "ready" | "served" | "cancelled" }) =>
      orderStatus({ data: p }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff-data", date] }),
  });

  // QR deep-link: /admin?code=XXX&token=YYY
  useEffect(() => {
    if (typeof window === "undefined" || !session.data) return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      setTab("prenotazioni");
      listReservations({ data: { date, token } }).then((rows) => {
        if (rows?.[0]) {
          // highlight handled by filter below
        }
      });
    }
  }, [session.data, date]);

  const tables = data.data?.tables ?? [];
  const orders = data.data?.orders ?? [];
  const menu = data.data?.menu ?? [];
  const team = data.data?.team ?? [];
  const offers = data.data?.offers ?? [];

  const openOrders = useMemo(
    () => orders.filter((o: any) => !["paid", "cancelled"].includes(o.status)),
    [orders],
  );

  if (session.isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Caricamento…</div>;
  }

  if (!session.data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-5">
        <h1 className="font-serif text-3xl">Area riservata</h1>
        <p className="text-sm text-muted-foreground">Inserisci il PIN gestore</p>
        <input
          type="password"
          className="w-full rounded-md border border-input bg-background px-3 py-3"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login.mutate()}
          placeholder="PIN"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={() => login.mutate()} disabled={login.isPending || pin.length < 3}>
          {login.isPending ? "Accesso…" : "Entra"}
        </Button>
        <Button asChild variant="link">
          <Link to="/">← Home</Link>
        </Button>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "prenotazioni", label: "Prenotazioni" },
    { id: "sala", label: "Sala" },
    { id: "cucina", label: "Cucina" },
    { id: "conti", label: "Conti" },
    { id: "menu", label: "Menù" },
    { id: "team", label: "Team" },
    { id: "offerte", label: "Offerte" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Admin Campagnola</h1>
          <p className="text-sm text-muted-foreground">
            {session.data.name} · {session.data.role}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Button variant="outline" size="sm" onClick={() => logout.mutate()}>
            Esci
          </Button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={tab === t.id ? "default" : "outline"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab === "prenotazioni" && (
        <div className="space-y-3">
          {(reservations.data ?? []).map((r: any) => (
            <div key={r.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{r.name} · {r.guests} pax</p>
                  <p className="text-sm text-muted-foreground">
                    {r.time} · {r.phone} · <span className="font-mono text-accent">{r.code}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{r.status}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(["Confermata", "In attesa", "Annullata", "Completata"] as const).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant="outline"
                      onClick={() => statusMut.mutate({ id: r.id, status: s })}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {tables.map((t: any) => (
                  <Button
                    key={t.id}
                    size="sm"
                    variant="ghost"
                    onClick={() => assignMut.mutate({ id: r.id, table: t.id, checkin: true })}
                  >
                    → {t.label}
                  </Button>
                ))}
              </div>
            </div>
          ))}
          {!reservations.data?.length && (
            <p className="text-sm text-muted-foreground">Nessuna prenotazione per questa data.</p>
          )}
        </div>
      )}

      {tab === "sala" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {tables.map((t: any) => {
            const tableOrders = openOrders.filter((o: any) => o.table_id === t.id);
            return (
              <div key={t.id} className="rounded-lg border border-border p-4">
                <p className="font-serif text-xl">{t.label}</p>
                <p className="text-xs text-muted-foreground">
                  {t.zone} · {t.capacity} posti · {t.active ? "attivo" : "off"}
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {tableOrders.map((o: any) => (
                    <li key={o.id}>
                      {o.quantity}× {o.dish_name} — {o.status}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {tab === "cucina" && (
        <div className="space-y-2">
          {openOrders
            .filter((o: any) => ["queued", "preparing", "ready"].includes(o.status))
            .map((o: any) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
                <div>
                  <p className="font-medium">
                    {o.quantity}× {o.dish_name}
                  </p>
                  <p className="text-xs text-muted-foreground">{o.status} · {o.notes || "—"}</p>
                </div>
                <div className="flex gap-1">
                  {(["preparing", "ready", "served", "cancelled"] as const).map((s) => (
                    <Button key={s} size="sm" variant="outline" onClick={() => orderStatusMut.mutate({ id: o.id, status: s })}>
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {tab === "conti" && (
        <div className="space-y-3">
          {tables.map((t: any) => {
            const open = openOrders.filter((o: any) => o.table_id === t.id);
            const total = open.reduce(
              (s: number, o: any) => s + Number(o.unit_price) * Number(o.quantity),
              0,
            );
            if (!open.length) return null;
            return (
              <div key={t.id} className="rounded-lg border border-border p-4">
                <p className="font-serif text-xl">{t.label}</p>
                <p className="text-sm">{open.length} voci · € {total.toFixed(2)}</p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={() => payMut.mutate({ table: t.id, method: "Contanti" })}>
                    Contanti
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => payMut.mutate({ table: t.id, method: "Carta" })}>
                    Carta
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "menu" && (
        <div className="space-y-2">
          <p className="rounded-md border border-accent/40 bg-accent/10 p-3 text-sm">
            Editor menù in modalità ghost: le modifiche non vengono salvate. Per aggiornare il menù
            contatta lo sviluppatore.
          </p>
          {menu.map((m: any) => (
            <div key={m.id} className="flex justify-between border-b border-border py-2 text-sm">
              <span>
                {m.name} <span className="text-muted-foreground">({m.category})</span>
              </span>
              <span className="text-primary">€ {Number(m.price).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "team" && (
        <div className="space-y-2">
          {team.map((m: any) => (
            <div key={m.email || m.id} className="rounded-lg border border-border p-3 text-sm">
              {m.display_name} · {m.email} · {m.role} · {m.active ? "attivo" : "off"}
            </div>
          ))}
          {!team.length && <p className="text-sm text-muted-foreground">Nessuno staff registrato.</p>}
        </div>
      )}

      {tab === "offerte" && (
        <div className="space-y-2">
          {offers.map((o: any) => (
            <div key={o.id} className="rounded-lg border border-border p-3 text-sm">
              {o.title} · {o.active ? "attiva" : "off"}
              {o.price != null && ` · € ${Number(o.price).toFixed(2)}`}
            </div>
          ))}
          {!offers.length && <p className="text-sm text-muted-foreground">Nessuna offerta.</p>}
        </div>
      )}

      <div className="mt-10">
        <Button asChild variant="link">
          <Link to="/">← Home</Link>
        </Button>
      </div>
    </div>
  );
}
