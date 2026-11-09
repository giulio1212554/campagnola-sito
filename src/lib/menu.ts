import { IMAGES } from "./images";

export type Dish = {
  name: string;
  nameEn: string;
  price: string;
  desc?: string;
  descEn?: string;
};
export type Section = {
  id: string;
  title: string;
  titleEn: string;
  image: string;
  dishes: Dish[];
};

export const MENU: Section[] = [
  {
    id: "antipasti",
    title: "Antipasti",
    titleEn: "Starters",
    image: IMAGES.antipasti,
    dishes: [
      {
        name: "Crocchè di Patate",
        nameEn: "Potato Croquettes",
        price: "2,00",
        desc: "Patate, fiordilatte, pepe, prezzemolo, panatura croccante",
        descEn: "Potato, fior di latte, pepper, parsley, crispy breading",
      },
      {
        name: "Fiore di Zucca Ripieno",
        nameEn: "Stuffed Courgette Flower",
        price: "3,00",
        desc: "Fiore di zucca, ricottina, provola, fritto in pastella",
        descEn: "Courgette flower, ricotta, provola, batter-fried",
      },
      {
        name: "Mozzarella in Carrozza",
        nameEn: "Mozzarella in Carrozza",
        price: "5,00",
        desc: "Mozzarella di bufala tra fette di pane fritte",
        descEn: "Buffalo mozzarella between fried bread slices",
      },
      {
        name: "Impepata di Cozze",
        nameEn: "Peppered Mussels",
        price: "7,00",
        desc: "Cozze fresche, pepe nero macinato, limone",
        descEn: "Fresh mussels, black pepper, lemon",
      },
      {
        name: "Prosciutto e Mozzarella",
        nameEn: "Ham and Mozzarella",
        price: "7,00",
        desc: "Prosciutto crudo e mozzarella di bufala campana",
        descEn: "Cured ham and Campania buffalo mozzarella",
      },
    ],
  },
  {
    id: "primi",
    title: "Primi Piatti",
    titleEn: "First courses",
    image: IMAGES.primi,
    dishes: [
      {
        name: "Pasta e Fagioli con Cozze",
        nameEn: "Pasta and Beans with Mussels",
        price: "9,00",
        desc: "Pasta mista, fagioli e cozze fresche",
        descEn: "Mixed pasta, beans and fresh mussels",
      },
      {
        name: "Ziti alla Genovese",
        nameEn: "Ziti alla Genovese",
        price: "10,00",
        desc: "Ziti spezzati a mano con cipolle stufate e manzo",
        descEn: "Hand-broken ziti with slow-cooked onions and beef",
      },
      {
        name: "Gnocchi alla Sorrentina",
        nameEn: "Gnocchi alla Sorrentina",
        price: "8,00",
        desc: "Gnocchi di patate, pomodoro, fiordilatte, basilico",
        descEn: "Potato gnocchi, tomato, fior di latte, basil",
      },
    ],
  },
  {
    id: "secondi",
    title: "Secondi Piatti",
    titleEn: "Main courses",
    image: IMAGES.secondi,
    dishes: [
      {
        name: "Parmigiana di Melanzane",
        nameEn: "Aubergine Parmigiana",
        price: "5,00",
        desc: "Melanzane fritte, pomodoro, provola",
        descEn: "Fried aubergine, tomato, provola cheese",
      },
      {
        name: "Polpette al Ragù",
        nameEn: "Meatballs in Ragù",
        price: "6,00",
        desc: "Polpette di carne affogate nel ragù napoletano",
        descEn: "Meatballs in Neapolitan ragù",
      },
      {
        name: "Salsiccia e Friarielli",
        nameEn: "Sausage and Friarielli",
        price: "7,00",
        desc: "Salsiccia di maiale con friarielli ripassati",
        descEn: "Pork sausage with sautéed friarielli greens",
      },
      {
        name: "Frittura Gamberi e Calamari",
        nameEn: "Fried Prawns and Squid",
        price: "12,00",
        desc: "Calamari e gamberi fritti, croccanti e leggeri",
        descEn: "Light crispy fried squid and prawns",
      },
    ],
  },
  {
    id: "pizze",
    title: "Pizze",
    titleEn: "Pizzas",
    image: IMAGES.pizze,
    dishes: [
      {
        name: "Margherita",
        nameEn: "Margherita",
        price: "6,00",
        desc: "Pomodoro, mozzarella, basilico",
        descEn: "Tomato, mozzarella, basil",
      },
      {
        name: "Marinara",
        nameEn: "Marinara",
        price: "5,00",
        desc: "Pomodoro, aglio, origano, olio EVO",
        descEn: "Tomato, garlic, oregano, extra-virgin olive oil",
      },
      {
        name: "Diavola",
        nameEn: "Diavola",
        price: "7,00",
        desc: "Pomodoro, mozzarella, salame piccante",
        descEn: "Tomato, mozzarella, spicy salami",
      },
    ],
  },
  {
    id: "dolci",
    title: "Dolci",
    titleEn: "Desserts",
    image: IMAGES.dolci,
    dishes: [
      {
        name: "Babà",
        nameEn: "Babà",
        price: "4,00",
        desc: "Babà al rum napoletano",
        descEn: "Neapolitan rum babà",
      },
      {
        name: "Tiramisu",
        nameEn: "Tiramisu",
        price: "5,00",
        desc: "Mascarpone, caffè, cacao",
        descEn: "Mascarpone, coffee, cocoa",
      },
      {
        name: "Pastiera",
        nameEn: "Pastiera",
        price: "5,00",
        desc: "Pastiera napoletana di ricotta",
        descEn: "Neapolitan ricotta pastiera",
      },
    ],
  },
];

/** Section title map for older call sites */
export const EN: Record<string, string> = Object.fromEntries(
  MENU.map((s) => [s.title, s.titleEn]),
);

export function dishEn(name: string): { nameEn: string; descEn?: string } {
  for (const s of MENU) {
    const d = s.dishes.find((x) => x.name === name);
    if (d) return { nameEn: d.nameEn, descEn: d.descEn };
  }
  return { nameEn: name };
}

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
  const parts = Object.fromEntries(
    fmt.formatToParts(new Date()).map((p) => [p.type, p.value]),
  );
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  return { jsDay: map[parts.weekday!] ?? 0, minutes };
}

export function isOpen(jsDay: number, minutes: number) {
  const day = HOURS.find((h) => h.jsDay === jsDay);
  if (!day || !day.slots.length) return false;
  return day.slots.some(([a, b]) => {
    const [ah, am] = a.split(":").map(Number);
    const [bh, bm] = b.split(":").map(Number);
    const start = ah! * 60 + am!;
    const end = bh! * 60 + bm!;
    return minutes >= start && minutes <= end;
  });
}
