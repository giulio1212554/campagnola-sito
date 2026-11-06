import { createMiddleware } from '@tanstack/react-start';
import { getCookie, getRequestHeader } from '@tanstack/react-start/server';
import { createClient } from '@supabase/supabase-js';
import type { StaffRole } from './operations';

export async function hashToken(token: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}

export const requireStaff = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const managerToken = getCookie('campagnola_staff');
  if (managerToken) {
    const { data } = await supabaseAdmin.from('manager_sessions').select('expires_at').eq('token_hash', await hashToken(managerToken)).maybeSingle();
    if (data && new Date(data.expires_at).getTime() > Date.now()) return next({ context: { staff: { id: null as string | null, name: 'Gestore', role: 'dirigente' as StaffRole } } });
  }
  const token = getRequestHeader('authorization')?.replace(/^Bearer /, '');
  if (!token) throw new Error('Accedi all\u2019area personale');
  const { data: auth, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !auth.user || !auth.user.email_confirmed_at || !auth.user.email) throw new Error('Verifica la tua email prima di accedere');
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) throw new Error('Accesso non disponibile');
  const userDb = createClient(url, key, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` }, fetch: (input, init) => { const h = new Headers(init?.headers); h.set('apikey', key); return fetch(input, { ...init, headers: h }); } } });
  const { data: currentRole } = await userDb.from('user_roles').select('role,active').eq('user_id', auth.user.id).maybeSingle();
  if (currentRole && !currentRole.active) throw new Error('Account disabilitato');
  if (!currentRole) {
    const { data: invite } = await supabaseAdmin.from('staff_invites').select('*').eq('email', auth.user.email.toLowerCase()).eq('active', true).maybeSingle();
    if (!invite || (invite.user_id && invite.user_id !== auth.user.id)) throw new Error('Questo account non è autorizzato dal gestore');
    const profile = await supabaseAdmin.from('profiles').upsert({ id: auth.user.id, display_name: invite.display_name });
    if (profile.error) throw new Error('Accesso non disponibile');
    const role = await supabaseAdmin.from('user_roles').upsert({ user_id: auth.user.id, role: invite.role, active: true }, { onConflict: 'user_id' });
    if (role.error) throw new Error('Accesso non disponibile');
    await supabaseAdmin.from('staff_invites').update({ user_id: auth.user.id }).eq('id', invite.id);
  }
  const { data: role } = await userDb.from('user_roles').select('role,active').eq('user_id', auth.user.id).maybeSingle();
  if (!role?.active || !['dirigente','cuoco','cassiere','cameriere'].includes(role.role)) throw new Error('Accesso non autorizzato');
  const { data: profile } = await userDb.from('profiles').select('display_name').eq('id', auth.user.id).maybeSingle();
  return next({ context: { staff: { id: auth.user.id as string | null, name: profile?.display_name ?? 'Staff', role: role.role as StaffRole } } });
});
