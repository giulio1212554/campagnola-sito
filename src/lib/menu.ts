export type Dish = { name: string; price: string; desc?: string };
export type Section = { id: string; title: string; image: string; dishes: Dish[] };

export const MENU: Section[] = [
  {
    id: "antipasti",
    title: "Antipasti",
    image: "",
    dishes: [
      { name: "Crocchè di Patate", price: "2,00", desc: "Patate, fiordilatte, pepe, prezzemolo, panatura croccante" },
      { name: "Fiore di Zucca Ripieno", price: "3,00", desc: "Fiore di zucca, ricottina, provola, fritto in pastella" },
      { name: "Mozzarella in Carrozza", price: "5,00", desc: "Mozzarella di bufala tra fette di pane fritte" },
      { name: "Impepata di Cozze", price: "7,00", desc: "Cozze fresche, pepe nero macinato, limone" },
      { name: "Prosciutto e Mozzarella", price: "7,00", desc: "Prosciutto crudo e mozzarella di bufala campana" },
    ],
  },
  {
    id: "primi",
    title: "Primi Piatti",
    image: "",
    dishes: [
      { name: "Pasta e Fagioli con Cozze", price: "9,00", desc: "Pasta mista, fagioli e cozze fresche" },
      { name: "Ziti alla Genovese", price: "10,00", desc: "Ziti spezzati a mano con cipolle stufate e manzo" },
      { name: "Gnocchi alla Sorrentina", price: "8,00", desc: "Gnocchi di patate, pomodoro, fiordilatte, basilico" },
    ],
  },
  {
    id: "secondi",
    title: "Secondi Piatti",
    image: "",
    dishes: [
      { name: "Parmigiana di Melanzane", price: "5,00", desc: "Melanzane fritte, pomodoro, provola" },
      { name: "Polpette al Ragù", price: "6,00", desc: "Polpette di carne affogate nel ragù napoletano" },
      { name: "Salsiccia e Friarielli", price: "7,00", desc: "Salsiccia di maiale con friarielli ripassati" },
      { name: "Frittura Gamberi e Calamari", price: "12,00", desc: "Calamari e gamberi fritti, croccanti e leggeri" },
    ],
  },
  {
    id: "pizze",
    title: "Pizze",
    image: "",
    dishes: [
      { name: "Margherita", price: "6,00", desc: "Pomodoro, mozzarella, basilico" },
      { name: "Marinara", price: "5,00", desc: "Pomodoro, aglio, origano, olio EVO" },
      { name: "Diavola", price: "7,00", desc: "Pomodoro, mozzarella, salame piccante" },
    ],
  },
  {
    id: "dolci",
    title: "Dolci",
    image: "",
    dishes: [
      { name: "Babà", price: "4,00", desc: "Babà al rum napoletano" },
      { name: "Tiramisu", price: "5,00", desc: "Mascarpone, caffè, cacao" },
      { name: "Pastiera", price: "5,00", desc: "Pastiera napoletana di ricotta" },
    ],
  },
];

export const EN: Record<string, string> = {
  Antipasti: "Starters",
  "Primi Piatti": "First courses",
  "Secondi Piatti": "Main courses",
  Pizze: "Pizzas",
  Dolci: "Desserts",
};

export type HourSlot = [string, string];
export type DayHours = { day: string; jsDay: number; slots: HourSlot[] };

export const HOURS: DayHours[] = [
  { day: "domenica", jsDay: 0, slots: [["12:00", "15:30"], ["19:00", "23:00"]] },
  { day: "lunedì", jsDay: 1, slots: [["12:00", "15:30"], ["19:00", "23:00"]] },
  { day: "martedì", jsDay: 2, slots: [] },
  { day: "mercoledì", jsDay: 3, slots: [["12:00", "15:30"], ["19:00", "23:00"]] },
  { day: "giovedì", jsDay: 4, slots: [["12:00", "15:30"], ["19:00", "23:00"]] },
  { day: "venerdì", jsDay: 5, slots: [["12:00", "15:30"], ["19:00", "23:30"]] },
  { day: "sabato", jsDay: 6, slots: [["12:00", "15:30"], ["19:00", "23:30"]] },
];

export function romeNow() {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  return { jsDay: map[parts.weekday] ?? 0, minutes };
}

export function isOpen(jsDay: number, minutes: number) {
  const day = HOURS.find((h) => h.jsDay === jsDay);
  if (!day || !day.slots.length) return false;
  return day.slots.some(([a, b]) => {
    const [ah, am] = a.split(":").map(Number);
    const [bh, bm] = b.split(":").map(Number);
    const start = ah * 60 + am;
    const end = bh * 60 + bm;
    return minutes >= start && minutes <= end;
  });
}
