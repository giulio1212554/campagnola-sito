import { createServerFn } from '@tanstack/react-start';
import { getRequestHeader, setCookie } from '@tanstack/react-start/server';
import { z } from 'zod';
import { requireStaff, hashToken } from './staff-middleware';
import { canOperate } from './operations';

const reservationSchema = z.object({ name:z.string().trim().min(2).max(80),phone:z.string().trim().min(6).max(25),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),time:z.enum(['12:30','13:00','13:30','14:00','14:30','19:30','20:00','20:30','21:00','21:30','22:00']),guests:z.number().int().min(1).max(12),notes:z.string().trim().max(500).nullable().optional().transform(v=>v||null) });
export const createReservation = createServerFn({method:'POST'}).inputValidator((d:unknown)=>reservationSchema.parse(d)).handler(async({data})=>{
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(new Date());
  const day=new Date(`${data.date}T12:00:00Z`);
  if(Number.isNaN(day.getTime()) || day.toISOString().slice(0,10)!==data.date || data.date<today || day.getUTCDay()===2) throw new Error('Data non disponibile');
  const {supabaseAdmin:db}=await import('@/integrations/supabase/client.server');
  const key=await hashToken(`booking:${getRequestHeader('cf-connecting-ip')??getRequestHeader('x-forwarded-for')??'unknown'}`);
  const attempt=await db.rpc('staff_login_attempt',{p_key:key});
  if(attempt.error || Number(attempt.data)>20) throw new Error('Troppe richieste, riprova più tardi');
  const {data:row,error}=await db.from('reservations').insert({...data,status:'In attesa'}).select('code,qr_token').single();
  if(error || !row) throw new Error('Impossibile salvare la prenotazione');
  return {code:row.code,token:row.qr_token};
});
export const managerLogin=createServerFn({method:'POST'}).inputValidator((d:unknown)=>z.object({pin:z.string().max(100)}).parse(d)).handler(async({data})=>{
  const {supabaseAdmin:db}=await import('@/integrations/supabase/client.server');
  const key=await hashToken(`login:${getRequestHeader('cf-connecting-ip')??getRequestHeader('x-forwarded-for')??'unknown'}`);
  const attempt=await db.rpc('staff_login_attempt',{p_key:key});
  if(attempt.error || Number(attempt.data)>10) throw new Error('Troppi tentativi. Riprova tra 15 minuti.');
  const pin=process.env['MANAGER_PIN'];
  if(!pin || await hashToken(data.pin)!==await hashToken(pin)) throw new Error('PIN errato');
  const token=crypto.randomUUID();
  const {error}=await db.from('manager_sessions').insert({token_hash:await hashToken(token),expires_at:new Date(Date.now()+8*60*60*1000).toISOString()});
  if(error) throw new Error('Accesso non disponibile');
  setCookie('campagnola_staff',token,{httpOnly:true,secure: getRequestHeader('x-forwarded-proto')==='https',sameSite:'lax',path:'/',maxAge:8*60*60});
  return {ok:true};
});
export const managerLogout=createServerFn({method:'POST'}).handler(async()=>{setCookie('campagnola_staff','',{httpOnly:true,path:'/',maxAge:0});return {ok:true};});
export const getStaffSession=createServerFn({method:'POST'}).middleware([requireStaff]).handler(async({context})=>context.staff);
export const listReservations=createServerFn({method:'POST'}).middleware([requireStaff]).inputValidator((d:unknown)=>z.object({date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),token:z.string().uuid().optional()}).parse(d)).handler(async({data,context})=>{
  if(!canOperate(context.staff.role,'read')) throw new Error('Non autorizzato');
  const {supabaseAdmin:db}=await import('@/integrations/supabase/client.server');
  let query=db.from('reservations').select('*').order('time');
  query=data.token?query.eq('qr_token',data.token):query.eq('date',data.date);
  const {data:rows,error}=await query;
  if(error) throw new Error('Errore caricamento');
  return rows??[];
});
export const setReservationStatus=createServerFn({method:'POST'}).middleware([requireStaff]).inputValidator((d:unknown)=>z.object({id:z.string().uuid(),status:z.enum(['Confermata','In attesa','Annullata','Completata'])}).parse(d)).handler(async({data,context})=>{
  if(!canOperate(context.staff.role,'reservation')) throw new Error('Non autorizzato');
  const {supabaseAdmin:db}=await import('@/integrations/supabase/client.server');
  const {error}=await db.from('reservations').update({status:data.status}).eq('id',data.id);
  if(error) throw new Error('Errore aggiornamento'); return {ok:true};
});
export const assignTable=createServerFn({method:'POST'}).middleware([requireStaff]).inputValidator((d:unknown)=>z.object({id:z.string().uuid(),table:z.string().uuid(),checkin:z.boolean()}).parse(d)).handler(async({data,context})=>{
  if(!canOperate(context.staff.role,'assign')) throw new Error('Non autorizzato');
  const {supabaseAdmin:db}=await import('@/integrations/supabase/client.server');
  const {error}=await db.rpc('assign_reservation_table',{p_id:data.id,p_table:data.table,p_checkin:data.checkin});
  if(error) { const known=['Tavolo inesistente','Prenotazione inesistente','Prenotazione non attiva','Posti insufficienti','Tavolo occupato in questo turno','Check-in consentito solo nel giorno prenotato']; throw new Error(known.find(s=>error.message.includes(s))??'Assegnazione non riuscita'); } return {ok:true};
});
