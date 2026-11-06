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
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Campagnola" }] }),
  component: AdminPage,
});

function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
}

type Tab =
  | "prenotazioni"
  | "sala"
  | "ordini"
  | "cucina"
  | "conti"
  | "dashboard"
  | "team"
  | "menu";
type Role = "dirigente" | "cuoco" | "cassiere" | "cameriere";

const ROLE_TABS: Record<Role, Tab[]> = {
  dirigente: ["dashboard", "sala", "prenotazioni", "cucina", "conti", "team", "menu"],
  cuoco: ["cucina"],
  cassiere: ["conti", "sala"],
  cameriere: ["prenotazioni", "sala", "ordini", "cucina"],
};

const COMMON_ING = [
  "aglio",
  "cipolla",
  "peperoncino",
  "formaggio",
  "mozzarella",
  "pomodoro",
  "basilico",
  "olive",
  "capperi",
  "acciughe",
  "glutine",
  "lattosio",
  "frutta secca",
];

const SALARY: Record<Role, number> = {
  dirigente: 2200,
  cuoco: 1600,
  cassiere: 1400,
  cameriere: 1300,
};

function AdminPage() {
  const qc = useQueryClient();
  const [loginName, setLoginName] = useState("");
  const [loginPhone, setLoginPhone] = useState("");
  const [loginAllergens, setLoginAllergens] = useState("dirigente");
  const [date, setDate] = useState(todayISO());
  const [tab, setTab] = useState<Tab>("sala");
  const [error, setError] = useState<string | null>(null);

  // waiter order form
  const [orderTable, setOrderTable] = useState("");
  const [orderDish, setOrderDish] = useState("");
  const [orderQty, setOrderQty] = useState(1);
  const [extraIng, setExtraIng] = useState<string[]>([]);
  const [removeIng, setRemoveIng] = useState<string[]>([]);
  const [orderNote, setOrderNote] = useState("");

  // team form
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("cameriere");

  const session = useQuery({
    queryKey: ["staff-session"],
    queryFn: () => getStaffSession(),
    retry: false,
  });

  const role = (session.data?.role ?? "dirigente") as Role;
  const allowedTabs = ROLE_TABS[role] ?? ROLE_TABS.dirigente;

  useEffect(() => {
    if (!allowedTabs.includes(tab)) setTab(allowedTabs[0]!);
  }, [role, tab, allowedTabs]);

  const login = useMutation({
    mutationFn: () =>
      managerLogin({
        data: { name: loginName, phone: loginPhone, allergens: loginAllergens },
      }),
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
    refetchInterval: 6000,
  });

  const data = useQuery({
    queryKey: ["staff-data", date],
    queryFn: () => staffData({ data: { date } }),
    enabled: !!session.data,
    refetchInterval: 5000,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["staff-data", date] });
    qc.invalidateQueries({ queryKey: ["reservations", date] });
  };

  const statusMut = useMutation({
    mutationFn: (p: {
      id: string;
      status: "Confermata" | "In attesa" | "Annullata" | "Completata";
    }) => setReservationStatus({ data: p }),
    onSuccess: refresh,
  });

  const assignMut = useMutation({
    mutationFn: (p: { id: string; table: string; checkin: boolean }) =>
      assignTable({ data: p }),
    onSuccess: refresh,
  });

  const addOrderMut = useMutation({
    mutationFn: () => {
      const mods = [
        ...removeIng.map((i) => `SENZA ${i}`),
        ...extraIng.map((i) => `EXTRA ${i}`),
        orderNote.trim(),
      ]
        .filter(Boolean)
        .join(" · ");
      return addOrder({
        data: {
          table_id: orderTable,
          menu_id: orderDish,
          quantity: orderQty,
          notes: mods || undefined,
          service_date: date,
        },
      });
    },
    onSuccess: () => {
      setExtraIng([]);
      setRemoveIng([]);
      setOrderNote("");
      setOrderQty(1);
      refresh();
    },
  });

  const orderStatusMut = useMutation({
    mutationFn: (p: {
      id: string;
      status: "queued" | "preparing" | "ready" | "served" | "cancelled";
    }) => orderStatus({ data: p }),
    onSuccess: refresh,
  });

  const payMut = useMutation({
    mutationFn: (p: { table: string; method: "Contanti" | "Carta" }) =>
      payTable({ data: { table: p.table, date, method: p.method } }),
    onSuccess: refresh,
  });

  const addStaffMut = useMutation({
    mutationFn: () =>
      saveStaff({
        data: {
          email: newEmail,
          display_name: newName,
          role: newRole,
          active: true,
        },
      }),
    onSuccess: () => {
      setNewName("");
      setNewEmail("");
      refresh();
    },
  });

  const tables = data.data?.tables ?? [];
  const orders = data.data?.orders ?? [];
  const menu = data.data?.menu ?? [];
  const team = data.data?.team ?? [];
  const sales = (data.data as any)?.sales;
  const resRows = reservations.data ?? [];

  const openOrders = useMemo(
    () => orders.filter((o: any) => !["paid", "cancelled"].includes(o.status)),
    [orders],
  );

  const kitchenOrders = useMemo(
    () =>
      openOrders.filter((o: any) =>
        ["queued", "pending", "preparing", "ready"].includes(o.status),
      ),
    [openOrders],
  );

  const floor = useMemo(() => {
    return tables.map((t: any) => {
      const tableOrders = openOrders.filter((o: any) => o.table_id === t.id);
      const seated = resRows.find(
        (r: any) =>
          (r.table_ids ?? []).map(String).includes(String(t.id)) &&
          (r.status === "seated" || r.status === "Completata"),
      );
      const reserved = resRows.find(
        (r: any) =>
          (r.table_ids ?? []).map(String).includes(String(t.id)) &&
          !["cancelled", "Annullata"].includes(r.status) &&
          !seated,
      );
      return {
        ...t,
        status: tableOrders.length || seated ? "busy" : reserved ? "reserved" : "free",
        guestName: seated?.name ?? reserved?.name ?? null,
        orderCount: tableOrders.length,
        bill: tableOrders.reduce(
          (s: number, o: any) => s + Number(o.unit_price) * Number(o.quantity),
          0,
        ),
      };
    });
  }, [tables, openOrders, resRows]);

  const occupied = floor.filter((t: any) => t.status === "busy").length;
  const free = floor.filter((t: any) => t.status === "free").length;

  if (session.isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Caricamento…</div>;
  }

  if (!session.data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-5">
        <h1 className="font-serif text-3xl">Area riservata</h1>
        <p className="text-sm text-muted-foreground">
          Accedi da Prenota ora con le credenziali staff
        </p>
        <input
          className="w-full rounded-md border border-input bg-background px-3 py-3"
          placeholder="Nome e cognome"
          value={loginName}
          onChange={(e) => setLoginName(e.target.value)}
        />
        <input
          type="password"
          className="w-full rounded-md border border-input bg-background px-3 py-3"
          placeholder="Telefono"
          value={loginPhone}
          onChange={(e) => setLoginPhone(e.target.value)}
        />
        <select
          className="w-full rounded-md border border-input bg-background px-3 py-3"
          value={loginAllergens}
          onChange={(e) => setLoginAllergens(e.target.value)}
        >
          <option value="dirigente">dirigente</option>
          <option value="cuoco">cuoco</option>
          <option value="cassiere">cassiere</option>
          <option value="cameriere">cameriere</option>
        </select>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={() => login.mutate()} disabled={login.isPending}>
          {login.isPending ? "Accesso…" : "Entra"}
        </Button>
        <Button asChild variant="link">
          <Link to="/prenota">← Prenota ora</Link>
        </Button>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "prenotazioni", label: "Prenotazioni" },
    { id: "sala", label: "Sala" },
    { id: "ordini", label: "Ordini" },
    { id: "cucina", label: "Cucina" },
    { id: "conti", label: "Conti / Checkout" },
    { id: "team", label: "Team" },
    { id: "menu", label: "Menù" },
  ].filter((t) => allowedTabs.includes(t.id));

  const toggleIng = (list: string[], set: (v: string[]) => void, item: string) => {
    set(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Admin Campagnola</h1>
          <p className="text-sm text-muted-foreground">
            {session.data.name} · <span className="text-primary">{session.data.role}</span>
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

      {/* DIRIGENTE DASHBOARD */}
      {tab === "dashboard" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase text-muted-foreground">Incasso 7 giorni</p>
              <p className="mt-1 font-serif text-3xl text-primary">
                € {(sales?.totalRevenue ?? 0).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">{sales?.totalOrders ?? 0} ordini pagati</p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase text-muted-foreground">Sala ora</p>
              <p className="mt-1 font-serif text-3xl">
                <span className="text-rose-400">{occupied}</span>
                <span className="text-muted-foreground"> / </span>
                <span className="text-emerald-400">{free}</span>
              </p>
              <p className="text-xs text-muted-foreground">occupati / liberi</p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase text-muted-foreground">Stipendi mensili</p>
              <p className="mt-1 font-serif text-3xl">
                €{" "}
                {(team.length
                  ? team.reduce(
                      (s: number, m: any) =>
                        s + (SALARY[(m.role as Role) ?? "cameriere"] ?? 1300),
                      0,
                    )
                  : Object.values(SALARY).reduce((a, b) => a + b, 0)
                ).toLocaleString("it-IT")}
              </p>
              <p className="text-xs text-muted-foreground">{team.length || 4} dipendenti</p>
            </div>
          </div>

          <div className="rounded-xl border border-border p-4">
            <p className="mb-3 text-sm font-medium">Stato tavoli</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {floor.map((t: any) => (
                <div
                  key={t.id}
                  className={`rounded-lg p-3 text-center text-sm ${
                    t.status === "busy"
                      ? "bg-rose-500/20 text-rose-200"
                      : t.status === "reserved"
                        ? "bg-amber-500/20 text-amber-200"
                        : "bg-emerald-500/20 text-emerald-200"
                  }`}
                >
                  <p className="font-medium">{t.label}</p>
                  <p className="text-[10px]">
                    {t.status === "busy"
                      ? `€ ${t.bill.toFixed(0)}`
                      : t.status === "reserved"
                        ? "in arrivo"
                        : "libero"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {(sales?.byDay ?? []).length > 0 && (
            <div className="rounded-xl border border-border p-4">
              <p className="mb-2 text-sm font-medium">Guadagni giornalieri</p>
              <div className="space-y-1 text-sm">
                {(sales.byDay as any[]).map((d) => (
                  <div key={d.date} className="flex justify-between border-b border-border py-1">
                    <span>{d.date}</span>
                    <span className="tabular-nums">€ {Number(d.revenue).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PRENOTAZIONI + check-in cameriere */}
      {tab === "prenotazioni" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Accogli i clienti: assegna tavolo e fai check-in.
          </p>
          {resRows.map((r: any) => (
            <div key={r.id} className="rounded-lg border border-border p-4">
              <p className="font-medium">
                {r.name} · {r.guests} pax · {r.time}
              </p>
              <p className="text-xs text-muted-foreground">
                {r.phone} · <span className="font-mono text-primary">{r.code}</span> · {r.status}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {tables.map((t: any) => (
                  <Button
                    key={t.id}
                    size="sm"
                    variant="outline"
                    onClick={() => assignMut.mutate({ id: r.id, table: t.id, checkin: true })}
                  >
                    Check-in → {t.label}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => statusMut.mutate({ id: r.id, status: "Completata" })}
                >
                  In sala
                </Button>
              </div>
            </div>
          ))}
          {!resRows.length && (
            <p className="text-sm text-muted-foreground">Nessuna prenotazione oggi.</p>
          )}
        </div>
      )}

      {/* SALA */}
      {tab === "sala" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {floor.map((t: any) => (
            <div
              key={t.id}
              className={`rounded-xl border p-4 ${
                t.status === "busy"
                  ? "border-rose-500/40 bg-rose-500/5"
                  : t.status === "reserved"
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-serif text-xl">{t.label}</p>
                <span className="text-xs uppercase">
                  {t.status === "busy"
                    ? "occupato"
                    : t.status === "reserved"
                      ? "in arrivo"
                      : "libero"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t.zone} · {t.capacity} posti
                {t.guestName ? ` · ${t.guestName}` : ""}
              </p>
              {t.orderCount > 0 && (
                <p className="mt-2 text-sm">
                  {t.orderCount} ordini · € {t.bill.toFixed(2)}
                </p>
              )}
              {role === "cameriere" && (
                <Button
                  size="sm"
                  className="mt-3"
                  variant="outline"
                  onClick={() => {
                    setOrderTable(t.id);
                    setTab("ordini");
                  }}
                >
                  Prendi ordine
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* CAMERIERE — ORDINI con +/- ingredienti */}
      {tab === "ordini" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Scegli tavolo e piatto, aggiungi o togli ingredienti, poi invia in cucina.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Tavolo</span>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                value={orderTable}
                onChange={(e) => setOrderTable(e.target.value)}
              >
                <option value="">— seleziona —</option>
                {tables.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.label} ({t.zone})
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Quantità</span>
              <input
                type="number"
                min={1}
                max={20}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                value={orderQty}
                onChange={(e) => setOrderQty(Number(e.target.value) || 1)}
              />
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Piatto</p>
            <div className="grid max-h-48 gap-1 overflow-y-auto sm:grid-cols-2">
              {menu.map((m: any) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setOrderDish(m.id)}
                  className={`rounded-md border px-3 py-2 text-left text-sm ${
                    orderDish === m.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  {m.name}{" "}
                  <span className="text-primary">€ {Number(m.price).toFixed(2)}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Togli ingredienti
            </p>
            <div className="flex flex-wrap gap-1">
              {COMMON_ING.map((ing) => (
                <button
                  key={`rm-${ing}`}
                  type="button"
                  onClick={() => toggleIng(removeIng, setRemoveIng, ing)}
                  className={`rounded-full px-2.5 py-1 text-xs ${
                    removeIng.includes(ing)
                      ? "bg-rose-500/30 text-rose-100 ring-1 ring-rose-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  − {ing}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Aggiungi ingredienti
            </p>
            <div className="flex flex-wrap gap-1">
              {COMMON_ING.map((ing) => (
                <button
                  key={`ex-${ing}`}
                  type="button"
                  onClick={() => toggleIng(extraIng, setExtraIng, ing)}
                  className={`rounded-full px-2.5 py-1 text-xs ${
                    extraIng.includes(ing)
                      ? "bg-emerald-500/30 text-emerald-100 ring-1 ring-emerald-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  + {ing}
                </button>
              ))}
            </div>
          </div>

          <input
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Note extra (es. cottura al sangue)"
            value={orderNote}
            onChange={(e) => setOrderNote(e.target.value)}
          />

          {(removeIng.length > 0 || extraIng.length > 0 || orderNote) && (
            <p className="text-xs text-muted-foreground">
              Modifiche:{" "}
              {[...removeIng.map((i) => `SENZA ${i}`), ...extraIng.map((i) => `EXTRA ${i}`), orderNote]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}

          <Button
            className="w-full"
            disabled={!orderTable || !orderDish || addOrderMut.isPending}
            onClick={() => addOrderMut.mutate()}
          >
            {addOrderMut.isPending ? "Invio…" : "Invia ordine in cucina"}
          </Button>

          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-sm font-medium">Ordini aperti</p>
            {openOrders.map((o: any) => (
              <div
                key={o.id}
                className="flex justify-between rounded-md border border-border px-3 py-2 text-sm"
              >
                <span>
                  T{o.table_id} · {o.quantity}× {o.dish_name}
                  {o.notes ? (
                    <span className="block text-xs text-muted-foreground">{o.notes}</span>
                  ) : null}
                </span>
                <span className="text-xs uppercase text-primary">{o.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CUOCO */}
      {tab === "cucina" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Ricevi gli ordini, prepara e segna come pronti per la sala.
          </p>
          {kitchenOrders.length === 0 && (
            <p className="text-sm text-muted-foreground">Nessun ordine in cucina.</p>
          )}
          {kitchenOrders.map((o: any) => (
            <div
              key={o.id}
              className={`rounded-xl border p-4 ${
                o.status === "ready"
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : o.status === "preparing"
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-border"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-serif text-xl">
                    {o.quantity}× {o.dish_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Tavolo {o.table_id} · {o.status}
                  </p>
                  {o.notes && (
                    <p className="mt-1 text-sm font-medium text-primary">{o.notes}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {o.status !== "preparing" && o.status !== "ready" && (
                    <Button
                      size="sm"
                      onClick={() =>
                        orderStatusMut.mutate({ id: o.id, status: "preparing" })
                      }
                    >
                      In preparazione
                    </Button>
                  )}
                  {o.status !== "ready" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => orderStatusMut.mutate({ id: o.id, status: "ready" })}
                    >
                      Pronto → sala
                    </Button>
                  )}
                  {o.status === "ready" && role === "cameriere" && (
                    <Button
                      size="sm"
                      onClick={() => orderStatusMut.mutate({ id: o.id, status: "served" })}
                    >
                      Servito
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      orderStatusMut.mutate({ id: o.id, status: "cancelled" })
                    }
                  >
                    Annulla
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CASSIERE — conti + checkout */}
      {tab === "conti" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Conti aperti per tavolo. Checkout per chiudere e liberare il tavolo.
          </p>
          {tables.map((t: any) => {
            const open = openOrders.filter((o: any) => o.table_id === t.id);
            if (!open.length) return null;
            const total = open.reduce(
              (s: number, o: any) => s + Number(o.unit_price) * Number(o.quantity),
              0,
            );
            return (
              <div key={t.id} className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <p className="font-serif text-2xl">{t.label}</p>
                  <p className="font-serif text-2xl text-primary">€ {total.toFixed(2)}</p>
                </div>
                <ul className="mt-3 divide-y divide-border text-sm">
                  {open.map((o: any) => (
                    <li key={o.id} className="flex justify-between py-2">
                      <span>
                        {o.quantity}× {o.dish_name}
                        {o.notes ? (
                          <span className="block text-xs text-muted-foreground">{o.notes}</span>
                        ) : null}
                      </span>
                      <span className="tabular-nums">
                        € {(Number(o.unit_price) * Number(o.quantity)).toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      if (confirm(`Checkout ${t.label} — Contanti € ${total.toFixed(2)}?`))
                        payMut.mutate({ table: t.id, method: "Contanti" });
                    }}
                  >
                    Checkout Contanti
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (confirm(`Checkout ${t.label} — Carta € ${total.toFixed(2)}?`))
                        payMut.mutate({ table: t.id, method: "Carta" });
                    }}
                  >
                    Checkout Carta
                  </Button>
                </div>
              </div>
            );
          })}
          {!openOrders.length && (
            <p className="text-sm text-muted-foreground">Nessun conto aperto.</p>
          )}
        </div>
      )}

      {/* TEAM dirigente */}
      {tab === "team" && (
        <div className="space-y-4">
          <div className="space-y-3 rounded-lg border border-border p-4">
            <p className="text-sm font-medium">Nuovo dipendente</p>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Nome"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as Role)}
            >
              <option value="dirigente">Dirigente</option>
              <option value="cuoco">Cuoco</option>
              <option value="cassiere">Cassiere</option>
              <option value="cameriere">Cameriere</option>
            </select>
            <Button
              disabled={!newName || !newEmail || addStaffMut.isPending}
              onClick={() => addStaffMut.mutate()}
            >
              Aggiungi
            </Button>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Account e stipendi</p>
            {(team.length
              ? team
              : [
                  { id: "1", display_name: "Gestore", email: "gestore@campagnola", role: "dirigente", active: true },
                ]
            ).map((m: any) => (
              <div
                key={m.id || m.email}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{m.display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.email} · <span className="text-primary">{m.role}</span>
                    {m.active === false ? " · off" : ""}
                  </p>
                </div>
                <p className="tabular-nums text-muted-foreground">
                  € {(SALARY[(m.role as Role) ?? "cameriere"] ?? 1300).toLocaleString("it-IT")}
                  /mese
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "menu" && (
        <div className="space-y-2">
          <p className="rounded-md border border-accent/40 bg-accent/10 p-3 text-sm">
            Menù in sola lettura (ghost). Per modifiche contatta lo sviluppatore.
          </p>
          {menu.map((m: any) => (
            <div key={m.id} className="flex justify-between border-b border-border py-2 text-sm">
              <span>{m.name}</span>
              <span className="text-primary">€ {Number(m.price).toFixed(2)}</span>
            </div>
          ))}
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
