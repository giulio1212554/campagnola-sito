import {createServerFn} from '@tanstack/react-start';
import {createClient} from '@supabase/supabase-js';
import {MENU,EN} from './menu';
export const publicMenu=createServerFn({method:'GET'}).handler(async()=>{
 const url=process.env['SUPABASE_URL'];const key=process.env['SUPABASE_PUBLISHABLE_KEY'];
 if(!url||!key)throw new Error('Menù non disponibile');
 const db=createClient(url,key,{auth:{persistSession:false},global:{fetch:(input,init)=>{const h=new Headers(init?.headers);if(h.get('Authorization')===`Bearer ${key}`)h.delete('Authorization');h.set('apikey',key);return fetch(input,{...init,headers:h});}}});
 const [menu,offers]=await Promise.all([db.from('menu_items').select('*').order('sort_order'),db.from('offers').select('*')]);
 if(menu.error||offers.error)throw new Error('Menù non disponibile');
 return {items:(menu.data??[]).map(d=>{const original=MENU.find(s=>s.id===d.category)?.dishes.find(x=>x.name===d.name);return {...d,description:d.description||original?.desc||'',description_en:d.description_en||(original?.desc?EN[original.desc]??original.desc:'')};}),offers:offers.data??[]};
});
