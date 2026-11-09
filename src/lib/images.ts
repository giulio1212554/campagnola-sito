/** Original Campagnola assets hosted on Lovable CDN */
const BASE =
  "https://id-preview--ed2fc449-7b74-4fc7-9cf5-f255d7c1174e.lovable.app/__l5e/assets-v1";

/** Foto dolce del cliente, crop centrato */
const DOLCI_DATA = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAgACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q==";

export const IMAGES = {
  hero: `${BASE}/e3da3b46-00f6-48fd-bf8d-d96f24481395/hero.jpg`,
  storia: `${BASE}/6761e5d7-1cfb-446c-916e-6694eafcb139/storia.jpg`,
  antipasti: `${BASE}/4402c7f6-642f-4542-8b23-ead1a25d20ae/antipasto.jpg`,
  primi: `${BASE}/89e1e444-856b-4461-a2f1-4a34cb948472/primo_piatto.jpg`,
  secondi: `${BASE}/b1cbd81f-fe41-4f88-b759-eb6b2f3e487a/secondo_piatto.jpg`,
  pizze: `${BASE}/8de97632-db49-44b8-bb69-f32ebfebbaa4/pizza.jpg`,
  dolci: DOLCI_DATA,
} as const;
