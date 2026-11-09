import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale, SectionTitle } from "@/components/site-shell";
import { MENU } from "@/lib/menu";
import { publicMenu } from "@/lib/public.functions";
import { ALLERGENS, ALLERGENS_EN } from "@/lib/operations";

const menuQuery = queryOptions({
  queryKey: ["public-menu"],
  queryFn: () => publicMenu(),
});

/** Crop focus so the dish sits in the middle of the circle */
const OBJECT_POS: Record<string, string> = {
  antipasti: "object-[center_45%]",
  primi: "object-[center_40%]",
  secondi: "object-[center_42%]",
  pizze: "object-center",
  dolci: "object-[center_28%]",
};

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Menù — Trattoria Enoteca Campagnola" },
      {
        name: "description",
        content: "Piatti napoletani, descrizioni, prezzi e informazioni sugli allergeni.",
      },
      { property: "og:title", content: "Menù Campagnola" },
      { property: "og:description", content: "La carta della Trattoria Enoteca Campagnola." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(menuQuery),
  component: MenuPage,
});

function MenuPage() {
  const { lang, text } = useLocale();
  const { data } = useSuspenseQuery(menuQuery);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <SectionTitle
        kicker={text("La carta", "Our menu")}
        title={text("Il nostro Menù", "The Menu")}
      />
      <nav className="mb-12 flex flex-wrap justify-center gap-4 text-sm text-accent">
        {MENU.map((s) => (
          <a href={`#${s.id}`} key={s.id}>
            {lang === "it" ? s.title : s.titleEn}
          </a>
        ))}
      </nav>
      {MENU.map((s) => (
        <section
          data-reveal
          id={s.id}
          key={s.id}
          className="scroll-mt-28 border-t border-border py-10"
        >
          <div className="mb-8 flex flex-col items-center gap-5">
            <div className="mx-auto flex w-full justify-center">
              <img
                src={s.image}
                alt={lang === "it" ? s.title : s.titleEn}
                className={`mx-auto block aspect-square h-60 w-60 max-w-full rounded-full object-cover shadow-lg ring-2 ring-primary/20 sm:h-72 sm:w-72 ${OBJECT_POS[s.id] ?? "object-center"}`}
              />
            </div>
            <h2 className="text-center text-3xl text-accent">
              {lang === "it" ? s.title : s.titleEn}
            </h2>
          </div>
          <ul>
            {data.items
              .filter((d) => d.category === s.id)
              .map((d) => (
                <li key={d.id} className="border-b border-border py-4">
                  <Button
                    variant="ghost"
                    onClick={() => setExpanded(expanded === d.id ? null : d.id)}
                    aria-expanded={expanded === d.id}
                    className="h-auto w-full justify-between gap-3 whitespace-normal p-0 text-left hover:bg-transparent"
                  >
                    <span className="min-w-0 flex-1 font-serif text-2xl leading-snug">
                      {lang === "it" ? d.name : d.name_en || d.name}
                    </span>
                    <span className="shrink-0 text-primary">
                      {Number(d.price)
                        .toFixed(2)
                        .replace(".", lang === "it" ? "," : ".")}{" "}
                      €
                    </span>
                    {expanded === d.id ? <X /> : <Plus />}
                  </Button>
                  {expanded === d.id && (
                    <div className="mt-3 space-y-2 pl-1 text-muted-foreground">
                      <p className="text-sm leading-relaxed">
                        {lang === "it"
                          ? d.description ||
                            text(
                              "Descrizione da confermare con il personale.",
                              "Please ask staff for the description.",
                            )
                          : d.description_en ||
                            d.description ||
                            text(
                              "Descrizione da confermare con il personale.",
                              "Please ask staff for the description.",
                            )}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium text-accent">
                          {text("Allergeni: ", "Allergens: ")}
                        </span>
                        {d.allergens === null
                          ? text(
                              "Elenco non ancora confermato. Chiedi al personale prima di ordinare.",
                              "Not yet confirmed. Ask staff before ordering.",
                            )
                          : d.allergens.length
                            ? d.allergens
                                .map(
                                  (a: string) =>
                                    (lang === "it"
                                      ? a
                                      : ALLERGENS_EN[ALLERGENS.indexOf(a)] ?? a),
                                )
                                .join(", ")
                            : text(
                                "Nessun allergene dichiarato nella ricetta; verifica le possibili contaminazioni con il personale.",
                                "No allergens declared in the recipe; ask staff about possible cross-contact.",
                              )}
                      </p>
                    </div>
                  )}
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
