import { useEffect } from "react";
import { appStore,useAppState } from "../core/store";
import { AppShell } from "./AppShell";
export function App(){const loading=useAppState(s=>s.loading),error=useAppState(s=>s.error);useEffect(()=>{void appStore.load();const onKey=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();appStore.palette(true)}if(e.key==="Escape")appStore.palette(false)};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey)},[]);if(loading)return <main className="boot">Booting DOS v5…</main>;if(error)return <main className="boot error">{error}</main>;return <AppShell/>}
