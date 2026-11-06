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

type Tab = "prenotazioni" | "sala" | "cucina" | "conti" | "menu" | "team" | "offerte";
type Role = "dirigente" | "cuoco" | "cassiere" | "cameriere";

const ROLE_TABS: Record<Role, Tab[]> = {
  dirigente: ["prenotazioni", "sala", "cucina", "conti", "menu", "team", "offerte"],
  cuoco: ["cucina"],
  cassiere: ["conti", "sala"],
  cameriere: ["prenotazioni", "sala", "cucina"],
};

function AdminPage() {
  const qc = useQueryClient();
  const [loginName, setLoginName] = useState("");
  const [loginPhone, setLoginPhone] = useState("");
  const [loginAllergens, setLoginAllergens] = useState("dirigente");
  const [date, setDate] = useState(todayISO());
  const [tab, setTab] = useState<Tab>("prenotazioni");
  const [error, setError] = useState<string | null>(null);
  const [lookup, setLookup] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
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
        data: {
          name: loginName,
          phone: loginPhone,
          allergens: loginAllergens,
        },
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
    refetchInterval: 8000,
  });

  const data = useQuery({
    queryKey: ["staff-data", date],
    queryFn: () => staffData({ data: { date } }),
    enabled: !!session.data,
    refetchInterval: 8000,
  });

  const statusMut = useMutation({
    mutationFn: (p: {
      id: string;
      status: "Confermata" | "In attesa" | "Annullata" | "Completata";
    }) => setReservationStatus({ data: p }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reservations", date] }),
  });

  const assignMut = useMutation({
    mutationFn: (p: { id: string; table: string; checkin: boolean }) =>
      assignTable({ data: p }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations", date] });
      qc.invalidateQueries({ queryKey: ["staff-data", date] });
      setScanMsg("Check-in completato");
    },
    onError: (e: Error) => setScanMsg(e.message),
  });

  const payMut = useMutation({
    mutationFn: (p: { table: string; method: "Contanti" | "Carta" }) =>
      payTable({ data: { table: p.table, date, method: p.method } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff-data", date] }),
  });

  const orderStatusMut = useMutation({
    mutationFn: (p: {
      id: string;
      status: "queued" | "preparing" | "ready" | "served" | "cancelled";
    }) => orderStatus({ data: p }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff-data", date] }),
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
      qc.invalidateQueries({ queryKey: ["staff-data", date] });
    },
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code") || params.get("token");
    if (code) {
      setLookup(code);
      setTab("prenotazioni");
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
      } catch {
        /* plain code */
      }
      const m = code.match(/CA-[A-Z0-9]+|PL-[A-Z0-9]+|[A-Z0-9]{4,12}/);
      if (m) code = m[0]!;
      setLookup(code);
      setScanMsg(`QR scansionato: ${code}`);
      setScanning(false);
    };

    const loadScript = (src: string) =>
      new Promise<void>((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const script = document.createElement("script");
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("script load failed"));
        document.head.appendChild(script);
      });

    const startBarcodeDetector = async () => {
      const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      const video = document.getElementById("qr-video") as HTMLVideoElement | null;
      if (!video) throw new Error("no video");
      video.srcObject = stream;
      await video.play();
      const tick = async () => {
        if (stopped) return;
        try {
          if (video.readyState >= 2) {
            const codes = await detector.detect(video);
            if (codes?.[0]?.rawValue) {
              onCode(codes[0].rawValue);
              return;
            }
          }
        } catch {
          /* ignore */
        }
        anim = requestAnimationFrame(tick);
      };
      anim = requestAnimationFrame(tick);
    };

    const startHtml5Qrcode = async () => {
      await loadScript("https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js");
      if (stopped) return;
      const Html5Qrcode = (window as any).Html5Qrcode;
      if (!Html5Qrcode) throw new Error("Html5Qrcode missing");
      const scanner = new Html5Qrcode("qr-reader");
      html5Scanner = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded: string) => onCode(decoded),
        () => {},
      );
    };

    (async () => {
      try {
        if ("BarcodeDetector" in window) {
          await startBarcodeDetector();
          return;
        }
        await startHtml5Qrcode();
      } catch (err) {
        console.error(err);
        try {
          if (!html5Scanner) await startHtml5Qrcode();
        } catch (err2) {
          console.error(err2);
          setScanMsg(
            "Impossibile usare la fotocamera. Digita il codice a mano oppure consenti l'accesso alla camera.",
          );
          setScanning(false);
        }
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
  const orders = data.data?.orders ?? [];
  const menu = data.data?.menu ?? [];
  const team = data.data?.team ?? [];
  const offers = data.data?.offers ?? [];
  const resRows = reservations.data ?? [];

  const openOrders = useMemo(
    () => orders.filter((o: any) => !["paid", "cancelled"].includes(o.status)),
    [orders],
  );

  const floor = useMemo(() => {
    return tables.map((t: any) => {
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
      const booking = seated || reserved;
      return {
        ...t,
        status: seated ? "seated" : reserved ? "reserved" : "free",
        guestName: booking?.name ?? null,
        guestCount: booking?.guests ?? null,
        code: booking?.code ?? null,
        resId: booking?.id ?? null,
      };
    });
  }, [tables, resRows]);

  const matched = resRows.find(
    (r: any) => r.code?.toUpperCase() === lookup.trim().toUpperCase(),
  );

  if (session.isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Caricamento…</div>;
  }

  if (!session.data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-5">
        <h1 className="font-serif text-3xl">Area riservata</h1>
        <p className="text-sm text-muted-foreground">Accesso staff</p>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Nome e cognome</label>
          <input
            className="w-full rounded-md border border-input bg-background px-3 py-3"
            value={loginName}
            onChange={(e) => setLoginName(e.target.value)}
            placeholder="Nome e cognome"
            autoComplete="off"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Telefono</label>
          <input
            type="password"
            className="w-full rounded-md border border-input bg-background px-3 py-3"
            value={loginPhone}
            onChange={(e) => setLoginPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login.mutate()}
            placeholder="Telefono"
            autoComplete="off"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Allergeni</label>
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
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          onClick={() => login.mutate()}
          disabled={login.isPending || loginName.trim().length < 3 || loginPhone.length < 3}
        >
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
  ].filter((t) => allowedTabs.includes(t.id));

  const tone = {
    free: "bg-emerald-500/20 ring-emerald-500/50",
    reserved: "bg-amber-500/20 ring-amber-500/50",
    seated: "bg-rose-500/20 ring-rose-500/50",
  } as const;

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

      {(tab === "prenotazioni" || tab === "sala") && (
        <section className="mb-6 rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-primary uppercase">
            Accoglienza QR
          </p>
          <h2 className="mt-1 font-serif text-xl">Scansiona o digita il codice</h2>

          {scanning ? (
            <div className="mt-3 overflow-hidden rounded-xl bg-black p-2">
              <video
                id="qr-video"
                className="aspect-video w-full rounded-lg object-cover"
                playsInline
                muted
              />
              <div id="qr-reader" className="w-full overflow-hidden rounded-lg" />
              <p className="mt-2 px-1 text-center text-[11px] text-white/60">
                Inquadra il QR del ticket. Se non parte, digita il codice sotto.
              </p>
              <Button className="mt-2 w-full" variant="secondary" onClick={() => setScanning(false)}>
                Chiudi scanner
              </Button>
            </div>
          ) : (
            <Button
              className="mt-3 w-full"
              variant="outline"
              onClick={() => {
                setScanMsg(null);
                setScanning(true);
              }}
            >
              Apri scanner fotocamera
            </Button>
          )}

          <div className="mt-3 flex gap-2">
            <input
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 font-mono uppercase"
              placeholder="CA-XXXX"
              value={lookup}
              onChange={(e) => setLookup(e.target.value.toUpperCase())}
            />
          </div>
          {scanMsg && <p className="mt-2 text-sm text-muted-foreground">{scanMsg}</p>}

          {matched && (
            <div className="mt-4 rounded-lg border border-primary/40 bg-primary/5 p-4">
              <p className="font-medium">
                {matched.name} · {matched.guests} pax
              </p>
              <p className="text-sm text-muted-foreground">
                {matched.time} · {matched.phone} ·{" "}
                <span className="font-mono text-primary">{matched.code}</span>
              </p>
              <p className="text-xs text-muted-foreground">Stato: {matched.status}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {tables.map((t: any) => (
                  <Button
                    key={t.id}
                    size="sm"
                    variant={selectedTable === t.id ? "default" : "outline"}
                    onClick={() => {
                      setSelectedTable(t.id);
                      assignMut.mutate({ id: matched.id, table: t.id, checkin: true });
                    }}
                  >
                    Check-in → {t.label}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => statusMut.mutate({ id: matched.id, status: "Completata" })}
                >
                  Segna in sala
                </Button>
              </div>
            </div>
          )}
          {lookup && !matched && (
            <p className="mt-2 text-sm text-destructive">
              Nessuna prenotazione con codice {lookup} per questa data.
            </p>
          )}
        </section>
      )}

      {tab === "prenotazioni" && (
        <div className="space-y-3">
          {resRows.map((r: any) => (
            <div key={r.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {r.name} · {r.guests} pax
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {r.time} · {r.phone} ·{" "}
                    <span className="font-mono text-primary">{r.code}</span>
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
          {!resRows.length && (
            <p className="text-sm text-muted-foreground">Nessuna prenotazione per questa data.</p>
          )}
        </div>
      )}

      {tab === "sala" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-zinc-950 p-4 text-white">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-medium tracking-[0.2em] text-white/50 uppercase">
                Mappa sala · {date}
              </p>
              <div className="flex gap-3 text-[10px] text-white/80">
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-emerald-400" /> libero
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-amber-400" /> in arrivo
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-rose-400" /> in sala
                </span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {floor.map((t: any) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTable(t.id)}
                  className={`flex flex-col justify-between rounded-2xl bg-white/8 p-3 text-left shadow-[0_0_0_1px_rgb(255_255_255/0.1)] transition-transform hover:-translate-y-0.5 ${
                    selectedTable === t.id ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <div
                    className={`size-7 rounded-full ring-1 ${tone[t.status as keyof typeof tone]}`}
                  />
                  <p className="mt-2 truncate text-[12px] font-medium">{t.label}</p>
                  <p className="truncate text-[10px] text-white/50">
                    {t.guestName
                      ? `${t.guestName} · ${t.guestCount}`
                      : `${t.capacity} posti · ${t.zone}`}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "cucina" && (
        <div className="space-y-2">
          {openOrders
            .filter((o: any) => ["queued", "preparing", "ready", "pending"].includes(o.status))
            .map((o: any) => (
              <div
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
              >
                <div>
                  <p className="font-medium">
                    {o.quantity}× {o.dish_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tavolo {o.table_id} · {o.status}
                  </p>
                </div>
                <div className="flex gap-1">
                  {(["preparing", "ready", "served", "cancelled"] as const).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant="outline"
                      onClick={() => orderStatusMut.mutate({ id: o.id, status: s })}
                    >
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
                <p className="text-sm">
                  {open.length} voci · € {total.toFixed(2)}
                </p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={() => payMut.mutate({ table: t.id, method: "Contanti" })}>
                    Contanti
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => payMut.mutate({ table: t.id, method: "Carta" })}
                  >
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
            Editor menù in modalità ghost: le modifiche non vengono salvate.
          </p>
          {menu.map((m: any) => (
            <div key={m.id} className="flex justify-between border-b border-border py-2 text-sm">
              <span>{m.name}</span>
              <span className="text-primary">€ {Number(m.price).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "team" && (
        <div className="space-y-4">
          <div className="space-y-3 rounded-lg border border-border p-4">
            <p className="text-sm font-medium">Aggiungi membro staff</p>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Nome visualizzato"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Email / username"
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
              {addStaffMut.isPending ? "Salvataggio…" : "Aggiungi"}
            </Button>
          </div>
          {team.map((m: any) => (
            <div key={m.email || m.id} className="rounded-lg border border-border p-3 text-sm">
              <span className="font-medium">{m.display_name}</span> · {m.email} ·{" "}
              <span className="text-primary">{m.role}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "offerte" && (
        <div className="space-y-2">
          {offers.map((o: any) => (
            <div key={o.id} className="rounded-lg border border-border p-3 text-sm">
              {o.title} · {o.active ? "attiva" : "off"}
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
