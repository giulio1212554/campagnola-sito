import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Star, Quote, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale, SectionTitle, MAPS, ADDRESS } from "@/components/site-shell";
import { MENU, HOURS, EN, romeNow, isOpen } from "@/lib/menu";
import { IMAGES } from "@/lib/images";
import { REVIEWS } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Trattoria Enoteca Campagnola — Via dei Tribunali 47, Napoli" },
      {
        name: "description",
        content:
          "Cucina di tradizione napoletana e vini dal 1947 nei Decumani. Menu, orari e prenotazioni.",
      },
      { property: "og:title", content: "Trattoria Enoteca Campagnola — Napoli dal 1947" },
      { property: "og:type", content: "restaurant" },
      { property: "og:image", content: IMAGES.hero },
    ],
  }),
  component: Home,
});

function Stars({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <span className="flex gap-0.5 text-accent">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`${className} fill-current`} />
      ))}
    </span>
  );
}

function Home() {
  const { lang, t, text } = useLocale();
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const tick = () => {
      const n = romeNow();
      setOpen(isOpen(n.jsDay, n.minutes));
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <section className="relative flex min-h-[78svh] items-end overflow-hidden">
        <img
          src={IMAGES.hero}
          alt="Via dei Tribunali, Napoli"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-hero-fade" />
        <div className="relative mx-auto max-w-3xl px-5 pb-14 pt-16 text-center">
          <p className="text-xs uppercase text-accent">{t.since}</p>
          <h1 className="mt-4 text-5xl leading-tight sm:text-7xl">
            Trattoria Enoteca <em className="text-primary">Campagnola</em>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-muted-foreground">{t.sub}</p>
          <p className="mt-6 text-sm text-accent">
            {open === null ? "…" : open ? t.open : t.closed} · Via dei Tribunali 47
          </p>
          <Button asChild className="mt-6 h-12">
            <Link to="/prenota">
              {text("Prenota ora", "Book now")}
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      <section data-reveal id="storia" className="scroll-mt-16 mx-auto max-w-3xl px-5 py-20">
        <p className="text-xs uppercase tracking-[0.35em] text-accent">{t.storyK}</p>
        <h2 className="mt-3 text-3xl font-medium sm:text-5xl">{t.storyT}</h2>
        <div className="mt-4 h-px w-16 bg-primary" />
        <p className="mt-5 text-sm leading-relaxed text-muted-foreground sm:text-base">{t.story1}</p>
        <img
          src={IMAGES.storia}
          alt={t.storyT}
          width={1280}
          height={1920}
          loading="lazy"
          className="mt-8 aspect-[2/3] w-full rounded-lg object-cover shadow-2xl"
        />
      </section>

      <section data-reveal className="mx-auto max-w-5xl px-5 pb-20">
        <SectionTitle kicker={t.menuK} title={t.menuT} />
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-5">
          {MENU.map((s) => (
            <Link to="/menu" key={s.id} className="text-center">
              <img
                src={s.image}
                alt={lang === "en" ? EN[s.title] ?? s.title : s.title}
                className="aspect-square w-full rounded-full object-cover"
                loading="lazy"
              />
              <h3 className="mt-3 text-xl">
                {lang === "en" ? EN[s.title] ?? s.title : s.title}
              </h3>
            </Link>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Button asChild variant="outline">
            <Link to="/menu">{text("Vedi il menù", "See the menu")}</Link>
          </Button>
        </div>
      </section>

      <section data-reveal className="border-y border-border bg-card/30 py-16">
        <SectionTitle kicker={t.revK} title={t.revT} />
        <div className="mx-auto max-w-5xl px-5">
          <div className="mb-8 flex flex-col items-center gap-2 rounded-lg border border-accent bg-background p-6 text-center">
            <p className="font-serif text-5xl">
              4.4 <span className="text-2xl text-muted-foreground">/ 5.0</span>
            </p>
            <Stars className="h-5 w-5" />
            <p className="max-w-xs text-sm text-muted-foreground">{t.rating}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {REVIEWS.map((r) => (
              <figure key={r.author} className="rounded-lg border border-border bg-background p-6">
                <Quote className="h-6 w-6 text-primary" />
                <blockquote className="mt-3 font-serif text-xl italic leading-relaxed">
                  “{lang === "en" ? r.en : r.text}”
                </blockquote>
                <figcaption className="mt-4 flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">— {r.author}</span>
                  <Stars />
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section data-reveal id="orari" className="mx-auto max-w-2xl px-5 py-20">
        <SectionTitle kicker={t.hoursK} title={t.hoursT} />
        <table className="w-full text-sm">
          <tbody>
            {HOURS.map((h) => (
              <tr key={h.day} className="border-b border-border">
                <td className="py-3 font-serif text-lg">{t.days[h.jsDay]}</td>
                <td className={`py-3 text-right ${h.slots.length ? "" : "font-medium text-primary"}`}>
                  {h.slots.length
                    ? h.slots.map(([a, b]) => `${a} - ${b}`).join(" | ")
                    : t.closedDay}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-8 flex items-center justify-center gap-2 text-center text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0 text-primary" />
          {ADDRESS}
        </p>
        <a
          href={MAPS}
          target="_blank"
          rel="noreferrer"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-md border border-accent px-5 py-3 text-sm uppercase tracking-[0.15em] text-accent transition hover:bg-accent hover:text-accent-foreground"
        >
          <MapPin className="h-4 w-4" /> {t.maps}
        </a>
      </section>
    </>
  );
}
