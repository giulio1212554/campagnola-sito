import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {Link,useLocation} from '@tanstack/react-router';
import {Toaster} from 'sonner';
import {Phone,CalendarCheck} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {T,type Lang} from '@/lib/i18n';
const Locale=createContext({lang:'it' as Lang,choose:(_l:Lang)=>{}});
export function useLocale(){const c=useContext(Locale);return {...c,t:T[c.lang],text:(it:string,en:string)=>c.lang==='it'?it:en};}
export const PHONE='+39081459034';
export const ADDRESS='Via dei Tribunali 47, 80138 Napoli NA';
export const MAPS=`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent('Trattoria Enoteca Campagnola, '+ADDRESS)}`;
export function SiteShell({children}:{children:ReactNode}){
 const [lang,setLang]=useState<Lang>('it');const path=useLocation({select:l=>l.pathname});
 useEffect(()=>{const l=localStorage.getItem('lang');if(l==='en'||l==='it')setLang(l);},[]);
 useEffect(()=>{document.documentElement.lang=lang;},[lang]);
 useEffect(()=>{let disposed=false;let cleanup=()=>{};if(!matchMedia('(prefers-reduced-motion: reduce)').matches)import('scrollreveal').then(({default:sr})=>{if(disposed)return;const reveal=sr();reveal.reveal('[data-reveal]',{distance:'20px',duration:650,interval:65,origin:'bottom',viewFactor:.12,reset:false,cleanup:true});cleanup=()=>reveal.destroy();});return()=>{disposed=true;cleanup();};},[path]);
 const choose=(l:Lang)=>{setLang(l);localStorage.setItem('lang',l);};const t=T[lang];const admin=path==='/admin';
 return <Locale.Provider value={{lang,choose}}><Toaster theme="dark" position="top-center"/><header className="fixed inset-x-0 top-0 z-40 border-b border-border bg-background/95 backdrop-blur"><div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3"><Link to="/" className="font-serif text-xl">Campagnola</Link><div className="flex gap-1" aria-label={lang==='it'?'Lingua':'Language'}>{(['it','en'] as Lang[]).map(l=><Button key={l} size="sm" variant={lang===l?'default':'ghost'} onClick={()=>choose(l)} aria-pressed={lang===l}>{l.toUpperCase()}</Button>)}</div></div><nav className="mx-auto flex max-w-6xl justify-center gap-6 px-4 pb-3 text-sm"><Link to="/" activeProps={{className:'text-accent'}} activeOptions={{exact:true}}>Home</Link><Link to="/menu" activeProps={{className:'text-accent'}}>{lang==='it'?'Menù':'Menu'}</Link><Link to="/prenota" activeProps={{className:'text-accent'}}>{lang==='it'?'Prenota ora':'Book now'}</Link></nav></header><main className="min-h-screen overflow-x-clip pt-24 pb-24">{children}<footer className="border-t border-border px-5 py-10 text-center text-sm text-muted-foreground"><p className="font-serif text-2xl text-foreground">Trattoria Enoteca Campagnola</p><p className="mt-2">{ADDRESS}</p><a href={`tel:${PHONE}`} className="text-accent">+39 081 459034</a></footer></main>{!admin&&<div className="sticky-actions fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-border bg-background/95 p-3 backdrop-blur"><Button asChild variant="outline" className="h-12"><a href={`tel:${PHONE}`}><Phone/>{t.call}</a></Button><Button asChild className="h-12"><Link to="/prenota"><CalendarCheck/>{lang==='it'?'Prenota ora':'Book now'}</Link></Button></div>}</Locale.Provider>;
}
export function SectionTitle({kicker,title}:{kicker:string;title:string}){return <div className="mb-8 text-center"><p className="text-xs uppercase text-accent">{kicker}</p><h2 className="mt-3 text-4xl sm:text-5xl">{title}</h2><div className="mx-auto mt-4 h-px w-16 bg-primary"/></div>;}
export const field='w-full min-w-0 rounded-md border border-input bg-background px-3 py-3 text-base outline-none focus:border-accent';
