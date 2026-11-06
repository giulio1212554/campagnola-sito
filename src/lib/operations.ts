export type StaffRole = 'dirigente' | 'cuoco' | 'cassiere' | 'cameriere';
export function canOperate(role: StaffRole, action: string) {
  if (role === 'dirigente') return true;
  const allowed: Record<Exclude<StaffRole, 'dirigente'>, string[]> = {
    cuoco: ['read', 'message', 'orderStatus'],
    cassiere: ['read', 'message', 'pay'],
    cameriere: ['read', 'message', 'order', 'orderStatus', 'assign', 'reservation'],
  };
  return allowed[role].includes(action);
}
export const ORDER_STATES = ['pending', 'preparing', 'ready', 'served', 'paid', 'cancelled'] as const;
export function billTotal(rows: { quantity: number; unit_price: number; status: string }[]) {
  return rows.filter(r => !['paid','cancelled'].includes(r.status)).reduce((sum, r) => sum + r.quantity * Number(r.unit_price), 0);
}
export const ALLERGENS = ['Glutine','Crostacei','Uova','Pesce','Arachidi','Soia','Latte','Frutta a guscio','Sedano','Senape','Sesamo','Solfiti','Lupini','Molluschi'];
export const ALLERGENS_EN = ['Gluten','Crustaceans','Eggs','Fish','Peanuts','Soy','Milk','Tree nuts','Celery','Mustard','Sesame','Sulphites','Lupin','Molluscs'];
