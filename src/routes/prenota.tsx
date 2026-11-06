import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, CalendarCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale, field, PHONE } from "@/components/site-shell";
import { QrTicket } from "@/components/QrTicket";
import { createReservation } from "@/lib/reservations.functions";

const TIMES = [
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
] as const;

export const Route = createFileRoute("/prenota")({
  head: () => ({
    meta: [
      { title: "Prenota — Trattoria Enoteca Campagnola" },
      {
        name: "description",
        content:
          "Prenota un tavolo online alla Trattoria Enoteca Campagnola. Ricevi codice e QR per il check-in.",
      },
      { property: "og:title", content: "Prenota — Campagnola" },
    ],
  }),
  component: PrenotaPage,
});

function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(
    new Date(),
  );
}

function PrenotaPage() {
  const { lang, text, t } = useLocale();
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState<string>("20:00");
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [ticket, setTicket] = useState<{ code: string; token: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const booking = useMutation({
    mutationFn: () =>
      createReservation({
        data: {
          name: name.trim(),
          phone: phone.trim(),
          date,
          time: time as (typeof TIMES)[number],
          guests,
          notes: notes.trim() || null,
        },
      }),
    onSuccess: (result) => {
      setTicket(result);
      setError(null);
    },
    onError: (err: Error) => setError(err.message || t.fail),
  });

  const canSubmit =
    name.trim().length >= 2 &&
    phone.trim().length >= 6 &&
    date >= todayISO() &&
    TIMES.includes(time as (typeof TIMES)[number]);

  if (ticket) {
    const qrValue =
      typeof window !== "undefined"
        ? `${window.location.origin}/admin?code=${ticket.code}&token=${ticket.token}`
        : ticket.code;

    return (
      <div className="mx-auto max-w-lg px-5 py-10" data-reveal>
        <div className="rounded-2xl border border-border bg-card/60 p-6 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-12 w-12 text-accent" />
          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-accent">
            {text("Prenotazione ricevuta", "Booking received")}
          </p>
          <h1 className="mt-2 font-serif text-3xl">
            {text("Il tuo tavolo", "Your table")}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {t.received(guests, date, time)}
          </p>
          <div className="mx-auto mt-8 max-w-[220px]">
            <QrTicket value={qrValue} label={ticket.code} />
          </div>
          <div className="mt-6 space-y-1 text-sm">
            <p className="font-medium">{name}</p>
            <p>
              {date} · {time} · {guests}{" "}
              {guests === 1 ? t.guest : t.guests}
            </p>
            <p className="font-mono text-lg tracking-wider text-accent">{ticket.code}</p>
            <p className="text-xs text-muted-foreground">
              {text(
                "Mostra il QR o il codice allo staff per il check-in",
                "Show the QR or code to staff for check-in",
              )}
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-3">
            <Button asChild variant="outline">
              <a
                href={`https://wa.me/39081459034?text=${encodeURIComponent(
                  `${t.waMsg}\n${t.waL[0]}: ${name}\n${t.waL[1]}: ${phone}\n${t.waL[2]}: ${date}\n${t.waL[3]}: ${time}\n${t.waL[4]}: ${guests}\nCodice: ${ticket.code}`,
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                {t.wa}
              </a>
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setTicket(null);
                setName("");
                setPhone("");
                setNotes("");
              }}
            >
              {t.again}
            </Button>
            <Button asChild variant="link">
              <Link to="/">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-10">
      <div data-reveal>
        <p className="text-xs uppercase tracking-[0.35em] text-accent">{t.bookK}</p>
        <h1 className="mt-2 font-serif text-4xl sm:text-5xl">{t.bookT}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {text(
            "Riceverai un codice e un QR da mostrare all’arrivo per il check-in.",
            "You will receive a code and QR to show on arrival for check-in.",
          )}
        </p>
      </div>

      <form
        className="mt-10 space-y-5"
        data-reveal
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSubmit || booking.isPending) return;
          setError(null);
          booking.mutate();
        }}
      >
        <label className="block space-y-1.5">
          <span className="text-sm text-muted-foreground">{t.name}</span>
          <input
            className={field}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            autoComplete="name"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm text-muted-foreground">{t.phone}</span>
          <input
            className={field}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            minLength={6}
            autoComplete="tel"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-1.5">
            <span className="text-sm text-muted-foreground">{text("Data", "Date")}</span>
            <input
              className={field}
              type="date"
              value={date}
              min={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm text-muted-foreground">{text("Persone", "Guests")}</span>
            <select
              className={field}
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="space-y-2">
          <span className="text-sm text-muted-foreground">{text("Orario", "Time")}</span>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {TIMES.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => setTime(slot)}
                className={`rounded-md border px-2 py-2.5 text-sm transition ${
                  time === slot
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border bg-background hover:border-accent/50"
                }`}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm text-muted-foreground">{t.notes}</span>
          <textarea
            className={`${field} min-h-[90px] resize-y`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
          />
        </label>

        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="h-12 w-full"
          disabled={!canSubmit || booking.isPending}
        >
          <CalendarCheck className="mr-2 h-4 w-4" />
          {booking.isPending ? t.sending : t.send}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          {text("Oppure chiama", "Or call")}{" "}
          <a href={`tel:${PHONE}`} className="text-accent">
            {PHONE}
          </a>
        </p>
      </form>
    </div>
  );
}
