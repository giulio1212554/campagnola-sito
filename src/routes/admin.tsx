import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  managerLogin, managerLogout, getStaffSession,
  listReservations, setReservationStatus, assignTable,
} from "@/lib/reservations.functions";
import { staffData, addOrder, orderStatus, payTable, saveStaff } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Campagnola" }] }),
  component: AdminPage,
});

function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
}

type Tab = "prenotazioni" | "sala" | "ordini" | "cucina" | "conti" | "dashboard" | "team" | "menu";
type Role = "dirigente" | "cuoco" | "cassiere" | "cameriere";

const ROLE_TABS: Record<Role, Tab[]> = {
  dirigente: ["dashboard", "sala", "prenotazioni", "cucina", "conti", "team", "menu"],
  cuoco: ["cucina"],
  cassiere: ["conti", "sala"],
  cameriere: ["prenotazioni", "sala", "ordini", "cucina"],
};

const ING = ["aglio","cipolla","peperoncino","formaggio","mozzarella","pomodoro","basilico","olive","capperi","glutine","lattosio"];
const SALARY: Record<Role, number> = { dirigente: 2200, cuoco: 1600, cassiere: 1400, cameriere: 1300 };

function opsKey(date: string) {
  return `campagnola_ops_orders_${date}`;
}
function loadLocalOrders(date: string): any[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(opsKey(date));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveLocalOrders(date: string, orders: any[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(opsKey(date), JSON.stringify(orders));
  } catch { /* quota */ }
}

function AdminPage() {
  const qc = useQueryClient();
  const [loginName, setLoginName] = useState("");
  const [loginPhone, setLoginPhone] = useState("");
  const [loginAllergens, setLoginAllergens] = useState("dirigente");
  const [date, setDate] = useState(todayISO());
  const [tab, setTab] = useState<Tab>("sala");
  const [error, setError] = useState<string | null>(null);
  const [lookup, setLookup] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const [orderMsg, setOrderMsg] = useState<string | null>(null);
  const [payMsg, setPayMsg] = useState<string | null>(null);
  const [localOrders, setLocalOrders] = useState<any[]>([]);
  const [orderTable, setOrderTable] = useState("");
  const [orderDish, setOrderDish] = useState("");
  const [orderQty, setOrderQty] = useState(1);
  const [extraIng, setExtraIng] = useState<string[]>([]);
  const [removeIng, setRemoveIng] = useState<string[]>([]);
  const [orderNote, setOrderNote] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("cameriere");

  const session = useQuery({ queryKey: ["staff-session"], queryFn: () => getStaffSession(), retry: false });
  const role = (session.data?.role ?? "dirigente") as Role;
  const allowedTabs = ROLE_TABS[role] ?? ROLE_TABS.dirigente;

  useEffect(() => {
    if (!allowedTabs.includes(tab)) setTab(allowedTabs[0]!);
  }, [role, tab, allowedTabs]);

  useEffect(() => {
    setLocalOrders(loadLocalOrders(date));
  }, [date, session.data]);

  const login = useMutation({
    mutationFn: () => managerLogin({ data: { name: loginName, phone: loginPhone, allergens: loginAllergens } }),
    onSuccess: () => { setError(null); qc.invalidateQueries({ queryKey: ["staff-session"] }); },
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
    refetchInterval: 4000,
  });
  const data = useQuery({
    queryKey: ["staff-data", date],
    queryFn: () => staffData({ data: { date } }),
    enabled: !!session.data,
    refetchInterval: 3000,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["staff-data", date] });
    qc.invalidateQueries({ queryKey: ["reservations", date] });
  };

  const statusMut = useMutation({
    mutationFn: (p: { id: string; status: "Confermata" | "In attesa" | "Annullata" | "Completata" }) =>
      setReservationStatus({ data: p }),
    onSuccess: refresh,
  });
  const assignMut = useMutation({
    mutationFn: (p: { id: string; table: string; checkin: boolean }) => assignTable({ data: p }),
    onSuccess: refresh,
  });

  const addOrderMut = useMutation({
    mutationFn: async () => {
      const mods = [
        ...removeIng.map((i) => `SENZA ${i}`),
        ...extraIng.map((i) => `EXTRA ${i}`),
        orderNote.trim(),
      ].filter(Boolean).join(" · ");
      const dishSnap = (data.data?.menu ?? []).find((m: any) => m.id === orderDish);
      const res = await addOrder({
        data: {
          table_id: orderTable,
          menu_id: orderDish,
          quantity: orderQty,
          notes: mods || undefined,
          service_date: date,
        },
      });
      return {
        res,
        snap: {
          table_id: String(orderTable),
          dish_name: dishSnap?.name ?? "Piatto",
          unit_price: Number(dishSnap?.price ?? 0),
          quantity: orderQty,
          notes: mods,
        },
      };
    },
    onSuccess: (payload) => {
      setExtraIng([]); setRemoveIng([]); setOrderNote(""); setOrderQty(1);
      setOrderMsg("Ordine inviato in cucina ✓");
      const created = payload.res?.order;
      const line = {
        id: created?.id ?? `local_${Date.now()}`,
        table_id: String(created?.table_id ?? payload.snap.table_id),
        dish_name: created?.dish_name ?? payload.snap.dish_name,
        unit_price: Number(payload.snap.unit_price),
        quantity: Number(payload.snap.quantity),
        notes: created?.notes ?? payload.snap.notes,
        status: "queued",
        service_date: date,
        paid_at: null,
      };
      const next = [...loadLocalOrders(date).filter((o: any) => o.id !== line.id), line];
      saveLocalOrders(date, next);
      setLocalOrders(next);
      refresh();
      setTimeout(refresh, 600);
    },
    onError: (e: Error) => setOrderMsg(e.message || "Errore invio ordine"),
  });

  const orderStatusMut = useMutation({
    mutationFn: (p: { id: string; status: "queued" | "preparing" | "ready" | "served" | "cancelled" }) =>
      orderStatus({ data: p }),
    onSuccess: (_res, vars) => {
      const next = loadLocalOrders(date).map((o: any) =>
        o.id === vars.id ? { ...o, status: vars.status } : o,
      );
      saveLocalOrders(date, next);
      setLocalOrders(next);
      refresh();
    },
  });

  const payMut = useMutation({
    mutationFn: (p: { table: string; method: "Contanti" | "Carta" }) =>
      payTable({ data: { table: p.table, date, method: p.method } }),
    onSuccess: (_res, vars) => {
      const next = loadLocalOrders(date).map((o: any) =>
        String(o.table_id) === String(vars.table) && o.status !== "cancelled"
          ? { ...o, status: "paid", paid_at: new Date().toISOString() }
          : o,
      );
      saveLocalOrders(date, next);
      setLocalOrders(next);
      setPayMsg(`Checkout ${vars.method} completato per tavolo ${vars.table}`);
      refresh();
    },
    onError: (e: Error) => setPayMsg(e.message || "Errore checkout"),
  });

  const addStaffMut = useMutation({
    mutationFn: () =>
      saveStaff({ data: { email: newEmail, display_name: newName, role: newRole, active: true } }),
    onSuccess: () => { setNewName(""); setNewEmail(""); refresh(); },
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const code = new URLSearchParams(window.location.search).get("code")
      || new URLSearchParams(window.location.search).get("token");
    if (code) {
      setLookup(code.toUpperCase());
      if (allowedTabs.includes("prenotazioni")) setTab("prenotazioni");
    }
  }, []);

  useEffect(() => {
    if (!scanning) return;
    let stopped = false;
    let stream: MediaStream | null = null;
    let anim = 0;
    let html5Scanner: { stop: () => Promise<void> } | null = null;

    const onCode = (raw: string) => {
      if (stopped) return;
      let code = raw.trim().toUpperCase();
      try {
        const u = new URL(raw);
        code = (u.searchParams.get("code") || u.searchParams.get("token") || code).toUpperCase();
      } catch { /* */ }
      const m = code.match(/CA-[A-Z0-9]+|[A-Z0-9]{4,12}/);
      if (m) code = m[0]!;
      setLookup(code);
      setScanMsg(`QR: ${code}`);
      setScanning(false);
      if (allowedTabs.includes("prenotazioni")) setTab("prenotazioni");
    };

    const loadScript = (src: string) =>
      new Promise<void>((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const s = document.createElement("script");
        s.src = src; s.onload = () => resolve(); s.onerror = () => reject(new Error("script"));
        document.head.appendChild(s);
      });

    const startBD = async () => {
      const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      const video = document.getElementById("qr-video") as HTMLVideoElement | null;
      if (!video) throw new Error("no video");
      video.srcObject = stream;
      await video.play();
      const tick = async () => {
        if (stopped) return;
        try {
          if (video.readyState >= 2) {
            const codes = await detector.detect(video);
            if (codes?.[0]?.rawValue) { onCode(codes[0].rawValue); return; }
          }
        } catch { /* */ }
        anim = requestAnimationFrame(tick);
      };
      anim = requestAnimationFrame(tick);
    };

    const startH5 = async () => {
      await loadScript("https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js");
      if (stopped) return;
      const Html5Qrcode = (window as any).Html5Qrcode;
      const scanner = new Html5Qrcode("qr-reader");
      html5Scanner = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (d: string) => onCode(d),
        () => {},
      );
    };

    (async () => {
      try {
        if ("BarcodeDetector" in window) { await startBD(); return; }
        await startH5();
      } catch {
        try { if (!html5Scanner) await startH5(); }
        catch { setScanMsg("Fotocamera non disponibile — digita il codice."); setScanning(false); }
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(anim);
      stream?.getTracks().forEach((t) => t.stop());
      html5Scanner?.stop().catch(() => {});
    };
  }, [scanning]);

  const tables = data.data?.tables ?? [];
  const menu = data.data?.menu ?? [];
  const serverOrders = data.data?.orders ?? [];
  const orders = useMemo(() => {
    const map = new Map<string, any>();
    for (const o of localOrders) {
      if (o && o.id) map.set(String(o.id), o);
    }
    for (const o of serverOrders) {
      if (o && o.id) map.set(String(o.id), o);
    }
    return Array.from(map.values());
  }, [localOrders, serverOrders]);
  const team = data.data?.team ?? [];
  const sales = (data.data as any)?.sales;
  const resRows = reservations.data ?? [];
  const matched = resRows.find((r: any) => r.code?.toUpperCase() === lookup.trim().toUpperCase());
  const openOrders = useMemo(
    () => orders.filter((o: any) => !["paid", "cancelled"].includes(o.status)),
    [orders],
  );
  const kitchenOrders = useMemo(
    () => openOrders.filter((o: any) => ["queued", "pending", "preparing", "ready"].includes(o.status)),
    [openOrders],
  );
  const floor = useMemo(() => tables.map((t: any) => {
    const tableOrders = openOrders.filter((o: any) => String(o.table_id) === String(t.id));
    const seated = resRows.find((r: any) =>
      (r.table_ids ?? []).map(String).includes(String(t.id)) &&
      (r.status === "seated" || r.status === "Completata"),
    );
    const reserved = resRows.find((r: any) =>
      (r.table_ids ?? []).map(String).includes(String(t.id)) &&
      !["cancelled", "Annullata"].includes(r.status) && !seated,
    );
    return {
      ...t,
      status: tableOrders.length || seated ? "busy" : reserved ? "reserved" : "free",
      guestName: seated?.name ?? reserved?.name ?? null,
      orderCount: tableOrders.length,
      bill: tableOrders.reduce((s: number, o: any) => s + Number(o.unit_price) * Number(o.quantity), 0),
    };
  }), [tables, openOrders, resRows]);

  const occupied = floor.filter((t: any) => t.status === "busy").length;
  const free = floor.filter((t: any) => t.status === "free").length;
  const toggle = (list: string[], set: (v: string[]) => void, item: string) =>
    set(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  if (session.isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Caricamento…</div>;
  }

  if (!session.data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-5">
        <h1 className="font-serif text-3xl">Area riservata</h1>
        <p className="text-sm text-muted-foreground">Accedi da Prenota ora con le credenziali staff</p>
        <input className="w-full rounded-md border border-input bg-background px-3 py-3" placeholder="Nome e cognome" value={loginName} onChange={(e) => setLoginName(e.target.value)} />
        <input type="password" className="w-full rounded-md border border-input bg-background px-3 py-3" placeholder="Telefono" value={loginPhone} onChange={(e) => setLoginPhone(e.target.value)} />
        <select className="w-full rounded-md border border-input bg-background px-3 py-3" value={loginAllergens} onChange={(e) => setLoginAllergens(e.target.value)}>
          <option value="dirigente">dirigente</option>
          <option value="cuoco">cuoco</option>
          <option value="cassiere">cassiere</option>
          <option value="cameriere">cameriere</option>
        </select>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={() => login.mutate()} disabled={login.isPending}>{login.isPending ? "Accesso…" : "Entra"}</Button>
        <Button asChild variant="link"><Link to="/prenota">← Prenota ora</Link></Button>
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Admin Campagnola</h1>
          <p className="text-sm text-muted-foreground">{session.data.name} · <span className="text-primary">{session.data.role}</span></p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
          <Button variant="outline" size="sm" onClick={() => logout.mutate()}>Esci</Button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button key={t.id} size="sm" variant={tab === t.id ? "default" : "outline"} onClick={() => setTab(t.id)}>{t.label}</Button>
        ))}
      </div>

      {tab === "dashboard" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase text-muted-foreground">Incasso 7 giorni</p>
              <p className="mt-1 font-serif text-3xl text-primary">€ {(sales?.totalRevenue ?? 0).toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase text-muted-foreground">Sala</p>
              <p className="mt-1 font-serif text-3xl"><span className="text-rose-400">{occupied}</span> / <span className="text-emerald-400">{free}</span></p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase text-muted-foreground">Stipendi / mese</p>
              <p className="mt-1 font-serif text-3xl">€ {(team.length ? team.reduce((s: number, m: any) => s + (SALARY[(m.role as Role) ?? "cameriere"] ?? 1300), 0) : 6500).toLocaleString("it-IT")}</p>
            </div>
          </div>
        </div>
      )}

      {tab === "prenotazioni" && (
        <div className="space-y-3">
          <section className="rounded-xl border border-border bg-card p-4">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-primary uppercase">Accoglienza QR</p>
            {scanning ? (
              <div className="mt-3 overflow-hidden rounded-xl bg-black p-2">
                <video id="qr-video" className="aspect-video w-full rounded-lg object-cover" playsInline muted />
                <div id="qr-reader" className="w-full" />
                <Button className="mt-2 w-full" variant="secondary" onClick={() => setScanning(false)}>Chiudi scanner</Button>
              </div>
            ) : (
              <Button className="mt-3 w-full" variant="outline" onClick={() => { setScanMsg(null); setScanning(true); }}>
                Apri scanner fotocamera
              </Button>
            )}
            <input className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 font-mono uppercase" placeholder="CA-XXXX" value={lookup} onChange={(e) => setLookup(e.target.value.toUpperCase())} />
            {scanMsg && <p className="mt-2 text-sm text-muted-foreground">{scanMsg}</p>}
            {matched && (
              <div className="mt-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
                <p className="font-medium">{matched.name} · {matched.guests} pax · {matched.time}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {tables.map((t: any) => (
                    <Button key={t.id} size="sm" onClick={() => assignMut.mutate({ id: matched.id, table: t.id, checkin: true })}>
                      Check-in → {t.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </section>
          {resRows.map((r: any) => (
            <div key={r.id} className="rounded-lg border border-border p-4">
              <p className="font-medium">{r.name} · {r.guests} pax · {r.time}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {tables.map((t: any) => (
                  <Button key={t.id} size="sm" variant="outline" onClick={() => assignMut.mutate({ id: r.id, table: t.id, checkin: true })}>→ {t.label}</Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "sala" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {floor.map((t: any) => (
            <div key={t.id} className={`rounded-xl border p-4 ${t.status === "busy" ? "border-rose-500/40" : "border-border"}`}>
              <p className="font-serif text-xl">{t.label}</p>
              <p className="text-xs text-muted-foreground">{t.status}{t.guestName ? ` · ${t.guestName}` : ""}</p>
              {t.orderCount > 0 && <p className="mt-2 text-sm">{t.orderCount} ordini · € {t.bill.toFixed(2)}</p>}
              {role === "cameriere" && (
                <Button size="sm" className="mt-3" variant="outline" onClick={() => { setOrderTable(t.id); setTab("ordini"); }}>Prendi ordine</Button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "ordini" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <select className="w-full rounded-md border border-input bg-background px-3 py-2" value={orderTable} onChange={(e) => setOrderTable(e.target.value)}>
              <option value="">Tavolo…</option>
              {tables.map((t: any) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <input type="number" min={1} max={20} className="w-full rounded-md border border-input bg-background px-3 py-2" value={orderQty} onChange={(e) => setOrderQty(Number(e.target.value) || 1)} />
          </div>
          <div className="grid max-h-48 gap-1 overflow-y-auto sm:grid-cols-2">
            {menu.map((m: any) => (
              <button key={m.id} type="button" onClick={() => setOrderDish(m.id)}
                className={`rounded-md border px-3 py-2 text-left text-sm ${orderDish === m.id ? "border-primary bg-primary/10" : "border-border"}`}>
                {m.name} <span className="text-primary">€ {Number(m.price).toFixed(2)}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {ING.map((ing) => (
              <button key={`r${ing}`} type="button" onClick={() => toggle(removeIng, setRemoveIng, ing)}
                className={`rounded-full px-2.5 py-1 text-xs ${removeIng.includes(ing) ? "bg-rose-500/30 ring-1 ring-rose-400" : "bg-muted"}`}>− {ing}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {ING.map((ing) => (
              <button key={`e${ing}`} type="button" onClick={() => toggle(extraIng, setExtraIng, ing)}
                className={`rounded-full px-2.5 py-1 text-xs ${extraIng.includes(ing) ? "bg-emerald-500/30 ring-1 ring-emerald-400" : "bg-muted"}`}>+ {ing}</button>
            ))}
          </div>
          <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Note" value={orderNote} onChange={(e) => setOrderNote(e.target.value)} />
          <Button className="w-full" disabled={!orderTable || !orderDish || addOrderMut.isPending}
            onClick={() => { setOrderMsg(null); addOrderMut.mutate(); }}>
            {addOrderMut.isPending ? "Invio…" : "Invia ordine in cucina"}
          </Button>
          {orderMsg && <p className={`text-sm ${orderMsg.includes("✓") ? "text-emerald-400" : "text-destructive"}`}>{orderMsg}</p>}
          <div className="space-y-2 border-t border-border pt-4">
            {openOrders.map((o: any) => (
              <div key={o.id} className="flex justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span>T{o.table_id} · {o.quantity}× {o.dish_name}</span>
                <span className="text-xs uppercase text-primary">{o.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "cucina" && (
        <div className="space-y-3">
          {kitchenOrders.length === 0 && <p className="text-sm text-muted-foreground">Nessun ordine in cucina.</p>}
          {kitchenOrders.map((o: any) => (
            <div key={o.id} className="rounded-xl border border-border p-4">
              <p className="font-serif text-xl">{o.quantity}× {o.dish_name}</p>
              <p className="text-sm text-muted-foreground">Tavolo {o.table_id} · {o.status}</p>
              {o.notes && <p className="mt-1 text-sm text-primary">{o.notes}</p>}
              <div className="mt-2 flex flex-wrap gap-1">
                {o.status !== "preparing" && o.status !== "ready" && (
                  <Button size="sm" onClick={() => orderStatusMut.mutate({ id: o.id, status: "preparing" })}>In preparazione</Button>
                )}
                {o.status !== "ready" && (
                  <Button size="sm" variant="secondary" onClick={() => orderStatusMut.mutate({ id: o.id, status: "ready" })}>Pronto → sala</Button>
                )}
                {o.status === "ready" && (role === "cameriere" || role === "dirigente") && (
                  <Button size="sm" onClick={() => orderStatusMut.mutate({ id: o.id, status: "served" })}>Servito</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "conti" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Conti aperti. Chiudi con Checkout Contanti o Carta.
          </p>
          {payMsg && (
            <p className={`text-sm ${payMsg.includes("completato") ? "text-emerald-400" : "text-destructive"}`}>
              {payMsg}
            </p>
          )}
          {tables.map((t: any) => {
            const open = openOrders.filter((o: any) => String(o.table_id) === String(t.id));
            if (!open.length) return null;
            const total = open.reduce(
              (s: number, o: any) => s + Number(o.unit_price) * Number(o.quantity),
              0,
            );
            return (
              <div key={t.id} className="rounded-xl border border-border p-4">
                <div className="flex justify-between">
                  <p className="font-serif text-2xl">{t.label}</p>
                  <p className="font-serif text-2xl text-primary">€ {total.toFixed(2)}</p>
                </div>
                <ul className="mt-3 divide-y divide-border text-sm">
                  {open.map((o: any) => (
                    <li key={o.id} className="flex justify-between py-2">
                      <span>
                        {o.quantity}× {o.dish_name}{" "}
                        <span className="text-xs text-muted-foreground">({o.status})</span>
                      </span>
                      <span className="tabular-nums">
                        € {(Number(o.unit_price) * Number(o.quantity)).toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    disabled={payMut.isPending}
                    onClick={() => {
                      setPayMsg(null);
                      if (confirm(`Checkout Contanti — ${t.label} € ${total.toFixed(2)}?`))
                        payMut.mutate({ table: String(t.id), method: "Contanti" });
                    }}
                  >
                    Checkout Contanti
                  </Button>
                  <Button
                    variant="outline"
                    disabled={payMut.isPending}
                    onClick={() => {
                      setPayMsg(null);
                      if (confirm(`Checkout Carta — ${t.label} € ${total.toFixed(2)}?`))
                        payMut.mutate({ table: String(t.id), method: "Carta" });
                    }}
                  >
                    Checkout Carta
                  </Button>
                </div>
              </div>
            );
          })}
          {!openOrders.length && (
            <p className="text-sm text-muted-foreground">
              Nessun conto aperto. Gli ordini del cameriere compaiono qui finché non fai checkout.
            </p>
          )}
        </div>
      )}

      {tab === "team" && (
        <div className="space-y-4">
          <div className="space-y-2 rounded-lg border border-border p-4">
            <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Nome" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={newRole} onChange={(e) => setNewRole(e.target.value as Role)}>
              <option value="dirigente">Dirigente</option>
              <option value="cuoco">Cuoco</option>
              <option value="cassiere">Cassiere</option>
              <option value="cameriere">Cameriere</option>
            </select>
            <Button disabled={!newName || !newEmail || addStaffMut.isPending} onClick={() => addStaffMut.mutate()}>Aggiungi</Button>
          </div>
          {team.map((m: any) => (
            <div key={m.email || m.id} className="flex justify-between rounded-lg border border-border p-3 text-sm">
              <span>{m.display_name} · {m.role}</span>
              <span>€ {(SALARY[(m.role as Role) ?? "cameriere"] ?? 1300).toLocaleString("it-IT")}/mese</span>
            </div>
          ))}
        </div>
      )}

      {tab === "menu" && (
        <div className="space-y-2">
          {menu.map((m: any) => (
            <div key={m.id} className="flex justify-between border-b border-border py-2 text-sm">
              <span>{m.name}</span>
              <span className="text-primary">€ {Number(m.price).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10"><Button asChild variant="link"><Link to="/">← Home</Link></Button></div>
    </div>
  );
}
