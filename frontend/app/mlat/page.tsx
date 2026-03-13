'use client';

import { useEffect, useRef, useState } from 'react';

interface Aircraft {
  icao: string; callsign?: string; lat: number; lon: number;
  alt_ft: number; speed_kts?: number; heading?: number;
  confidence: number; cooperative: boolean; sensor_count?: number;
  is_ghost?: boolean; color?: string; type?: string;
}

const DEMO: Aircraft[] = [
  { icao:'BAW123', callsign:'BA123', lat:51.50, lon:-0.45, alt_ft:22000, speed_kts:310, heading:95,  confidence:0.94, cooperative:true,  sensor_count:6 },
  { icao:'RYR88X', callsign:'FR88X', lat:51.62, lon:-0.30, alt_ft:9500,  speed_kts:240, heading:145, confidence:0.87, cooperative:true,  sensor_count:5 },
  { icao:'N33LAX',                   lat:51.45, lon:-1.10, alt_ft:5200,  speed_kts:180, heading:220, confidence:0.71, cooperative:false, sensor_count:4 },
];

const GHOSTS = [
  { icao:'AWX001', callsign:'GHOST-1', type:'B738', alt_ft:34000, speed_kts:485, heading:127, cooperative:false, color:'#FF4444',
    waypoints:[[51.80,-2.50],[51.65,-1.50],[51.50,-0.50],[51.35,0.30]] as [number,number][], duration:30000, delay:0 },
  { icao:'AWX002', callsign:'EZY247',  type:'A320', alt_ft:28500, speed_kts:420, heading:195, cooperative:true,  color:'#3DDC97',
    waypoints:[[52.10,-0.90],[51.70,-0.75],[51.30,-0.65],[51.10,-0.60]] as [number,number][], duration:24000, delay:6000 },
  { icao:'AWX003', callsign:'GHOST-3', type:'UNKN', alt_ft:41000, speed_kts:510, heading:78,  cooperative:false, color:'#FFB020',
    waypoints:[[51.60,-2.20],[51.52,-0.80],[51.48,0.60]] as [number,number][], duration:26000, delay:12000 },
];

function lerp(a:[number,number],b:[number,number],t:number):[number,number]{return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];}
function routePos(wps:[number,number][],p:number):[number,number]{const s=wps.length-1,x=p*s,i=Math.min(Math.floor(x),s-1);return lerp(wps[i],wps[i+1],x-i);}

function svgIcon(color:string,heading:number,ghost:boolean){
  const pulse=ghost?`<circle cx="16" cy="16" r="5" fill="${color}" opacity="0.35"><animate attributeName="r" values="5;13;5" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite"/></circle>`:'';
  const ring=ghost?`<circle cx="16" cy="16" r="13" fill="none" stroke="${color}" stroke-width="1.2" stroke-dasharray="3,3" opacity="0.45"/>`:'';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 32 32">${pulse}<g transform="rotate(${heading},16,16)"><path d="M16 3L18.5 13L29 17.5L29 20L18.5 17.5L17.5 26L21 27.5L21 29L16 27.5L11 29L11 27.5L14.5 26L13.5 17.5L3 20L3 17.5L13.5 13Z" fill="${color}" opacity="0.92"/></g>${ring}</svg>`;
}

function popup(ac:Aircraft){
  const c=ac.color??(ac.cooperative?'#3DDC97':'#FF4444'),p=Math.round(ac.confidence*100),b=p>=85?'#3DDC97':p>=65?'#FFB020':'#FF4444';
  return `<div style="background:#0D1117;border:1px solid ${c}44;border-radius:8px;padding:12px 14px;min-width:210px;font-family:'Courier New',monospace;color:#E6EAF0;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><span style="background:${c}22;color:${c};border:1px solid ${c}55;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:bold;">${ac.cooperative?'● ADS-B':'◌ MLAT ONLY'}</span>${ac.type?`<span style="color:#555;font-size:10px;">${ac.type}</span>`:''}</div>
    <div style="font-size:15px;font-weight:bold;color:${c};margin-bottom:8px;">${ac.icao}${ac.callsign?` · ${ac.callsign}`:''}</div>
    <div style="display:grid;grid-template-columns:auto 1fr;gap:3px 10px;font-size:11px;margin-bottom:8px;">
      <span style="color:#666;">ALT</span><span>${ac.alt_ft.toLocaleString()} ft</span>
      ${ac.speed_kts?`<span style="color:#666;">SPD</span><span>${ac.speed_kts} kts</span>`:''}
      <span style="color:#666;">CONF</span><span style="color:${b}">${p}%</span>
      <span style="color:#666;">METHOD</span><span style="color:#3DDC97;">${ac.cooperative?'ADS-B+MLAT':'TDOA/MLAT'}</span>
    </div>
    <div style="height:3px;background:#1a1a2e;border-radius:2px;overflow:hidden;margin-bottom:8px;"><div style="height:100%;width:${p}%;background:${b};"></div></div>
    ${!ac.cooperative?`<div style="padding:5px 8px;background:#FF444411;border:1px solid #FF444433;border-radius:4px;font-size:10px;color:#FF8888;margin-bottom:6px;">⚠ Non-cooperative · No transponder</div>`:''}
    <div style="padding:4px 6px;background:#3DDC9711;border-radius:4px;font-size:9px;color:#3DDC9799;">HCS: 0.0.7968510${ac.is_ghost?' · DEMO':''}</div>
  </div>`;
}

export default function MLATPage(){
  const elRef=useRef<HTMLDivElement>(null);
  const mapRef=useRef<unknown>(null);
  const mRef=useRef<Map<string,unknown>>(new Map());
  const tRef=useRef<Map<string,unknown>>(new Map());
  const tdRef=useRef<Map<string,[number,number][]>>(new Map());
  const rafRef=useRef(0);
  const t0Ref=useRef(0);

  const [list,setList]=useState<Aircraft[]>(DEMO);
  const [sel,setSel]=useState<Aircraft|null>(null);
  const [q,setQ]=useState('');
  const [reply,setReply]=useState('');
  const [loading,setLoading]=useState(false);
  const [seq,setSeq]=useState(4824);

  useEffect(()=>{const t=setInterval(()=>setSeq(s=>s+1),3200);return()=>clearInterval(t);},[]);

  useEffect(()=>{
    if(mapRef.current||!elRef.current)return;
    if(!document.getElementById('lf-css')){const l=document.createElement('link');l.id='lf-css';l.rel='stylesheet';l.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(l);}

    import('leaflet').then(L=>{
      if(mapRef.current||!elRef.current)return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete(L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({iconRetinaUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',iconUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'});
      const map=L.map(elRef.current!,{center:[51.5,-0.8],zoom:9,zoomControl:true,attributionControl:false});
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:19}).addTo(map);
      mapRef.current=map;
      DEMO.forEach(ac=>mark(L,map,ac));
      t0Ref.current=Date.now();

      const tick=()=>{
        const now=Date.now(),ghosts:Aircraft[]=[];
        GHOSTS.forEach(g=>{
          const e=now-t0Ref.current-g.delay;if(e<0)return;
          const[lat,lon]=routePos(g.waypoints,(e%g.duration)/g.duration);
          const ac:Aircraft={icao:g.icao,callsign:g.callsign,type:g.type,lat,lon,alt_ft:g.alt_ft,speed_kts:g.speed_kts,heading:g.heading,confidence:g.cooperative?0.91:0.73,cooperative:g.cooperative,sensor_count:g.cooperative?6:4,is_ghost:true,color:g.color};
          ghosts.push(ac);mark(L,map,ac);
          const tr=tdRef.current.get(g.icao)??[];tr.push([lat,lon]);if(tr.length>10)tr.shift();tdRef.current.set(g.icao,tr);
          if(tr.length>=2){const ep=tRef.current.get(g.icao) as import('leaflet').Polyline|undefined;if(ep){ep.setLatLngs(tr);}else{const p=L.polyline(tr,{color:g.color,weight:1.5,opacity:0.45,dashArray:'5,6'});p.addTo(map);tRef.current.set(g.icao,p);}}
        });
        setList([...DEMO,...ghosts]);
        rafRef.current=requestAnimationFrame(tick);
      };
      rafRef.current=requestAnimationFrame(tick);
    });

    return()=>{
      cancelAnimationFrame(rafRef.current);
      if(mapRef.current){(mapRef.current as{remove:()=>void}).remove();mapRef.current=null;}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  function mark(L:typeof import('leaflet'),map:import('leaflet').Map,ac:Aircraft){
    const c=ac.color??(ac.cooperative?'#3DDC97':'#FF4444');
    const icon=L.divIcon({html:svgIcon(c,ac.heading??0,!ac.cooperative),className:'',iconSize:[36,36],iconAnchor:[18,18]});
    const ex=mRef.current.get(ac.icao) as import('leaflet').Marker|undefined;
    if(ex){ex.setLatLng([ac.lat,ac.lon]);ex.setIcon(icon);}
    else{const m=L.marker([ac.lat,ac.lon],{icon,zIndexOffset:500});m.bindPopup(popup(ac),{maxWidth:260,className:'aw-popup'});m.on('click',()=>setSel(ac));m.addTo(map);mRef.current.set(ac.icao,m);}
  }

  async function ask(question:string){
    if(!question.trim())return;
    setLoading(true);setReply('');
    try{
      const ctx=list.map(a=>`${a.icao}: alt=${a.alt_ft}ft conf=${Math.round(a.confidence*100)}% ${a.cooperative?'ADS-B':'MLAT-only'}`).join('\n');
      const r=await fetch('/api/groq',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'llama-3.3-70b-versatile',max_tokens:200,messages:[{role:'system',content:'Aviation intelligence AI. Be concise, 2-3 sentences.'},{role:'user',content:`Aircraft:\n${ctx}\n\nQuestion: ${question}`}]})});
      const d=await r.json();
      setReply(d?.choices?.[0]?.message?.content??'No response.');
    }catch{setReply('AI unavailable — add GROQ_API_KEY to Vercel env vars.');}
    finally{setLoading(false);}
  }

  function focus(ac:Aircraft){
    setSel(ac);
    const map=mapRef.current as import('leaflet').Map|null;
    if(map){map.panTo([ac.lat,ac.lon]);(mRef.current.get(ac.icao) as import('leaflet').Marker|undefined)?.openPopup();}
  }

  const nonCoop=list.filter(a=>!a.cooperative).length;
  const avgConf=list.length?Math.round(list.reduce((s,a)=>s+a.confidence,0)/list.length*100):0;

  return(
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'#080B0F',color:'#E6EAF0',fontFamily:'system-ui,sans-serif',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:'16px',padding:'10px 16px',borderBottom:'1px solid #1a2030',background:'#0D1117',flexShrink:0}}>
        <span style={{color:'#3DDC97',fontSize:'15px',fontWeight:700}}>✈ AircraftWorth</span>
        <span style={{color:'#4a9',fontSize:'11px',fontFamily:'monospace'}}>MLAT LIVE</span>
        <div style={{display:'flex',gap:'20px',marginLeft:'12px'}}>
          {[{l:'TRACKED',v:list.length,c:'#3DDC97'},{l:'NON-COOP',v:nonCoop,c:'#FF4444'},{l:'AVG CONF',v:`${avgConf}%`,c:'#FFB020'},{l:'HCS SEQ',v:`#${seq}`,c:'#7B8FFF'}].map(k=>(
            <div key={k.l} style={{textAlign:'center'}}>
              <div style={{color:k.c,fontSize:'14px',fontWeight:700,fontFamily:'monospace'}}>{k.v}</div>
              <div style={{color:'#444',fontSize:'9px',letterSpacing:'1px'}}>{k.l}</div>
            </div>
          ))}
        </div>
        <div style={{marginLeft:'auto'}}>
          <a href="https://hashscan.io/testnet/topic/0.0.7968510" target="_blank" rel="noreferrer"
            style={{background:'#7B8FFF22',border:'1px solid #7B8FFF44',color:'#7B8FFF',padding:'4px 10px',borderRadius:'4px',fontSize:'11px',fontFamily:'monospace',textDecoration:'none'}}>HCS ↗</a>
        </div>
      </div>

      <div style={{flex:1,display:'flex',overflow:'hidden'}}>
        <div ref={elRef} style={{flex:1,position:'relative'}}/>

        <div style={{width:'270px',borderLeft:'1px solid #1a2030',background:'#0A0E14',display:'flex',flexDirection:'column',overflow:'hidden',flexShrink:0}}>
          <div style={{padding:'12px',borderBottom:'1px solid #1a2030'}}>
            <div style={{color:'#3DDC97',fontSize:'11px',fontWeight:600,letterSpacing:'1px',marginBottom:'8px'}}>🧠 AI QUERY</div>
            <div style={{display:'flex',gap:'6px',marginBottom:'8px'}}>
              <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&ask(q)} placeholder="Ask about aircraft..."
                style={{flex:1,background:'#0D1117',border:'1px solid #1a2030',color:'#E6EAF0',padding:'6px 8px',borderRadius:'4px',fontSize:'12px',outline:'none',fontFamily:'monospace'}}/>
              <button onClick={()=>ask(q)} disabled={loading}
                style={{background:loading?'#1a2030':'#3DDC9722',border:'1px solid #3DDC9744',color:'#3DDC97',padding:'6px 10px',borderRadius:'4px',cursor:'pointer',fontSize:'12px'}}>
                {loading?'…':'→'}
              </button>
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:'4px'}}>
              {['Non-cooperative?','Highest altitude?','Lowest confidence?'].map(x=>(
                <button key={x} onClick={()=>{setQ(x);ask(x);}}
                  style={{background:'#1a2030',border:'1px solid #252d3d',color:'#888',padding:'3px 7px',borderRadius:'3px',cursor:'pointer',fontSize:'10px',fontFamily:'monospace'}}>{x}</button>
              ))}
            </div>
            {reply&&<div style={{marginTop:'10px',padding:'8px',background:'#3DDC9711',border:'1px solid #3DDC9733',borderRadius:'4px',fontSize:'11px',color:'#B0F0D0',lineHeight:'1.5',fontFamily:'monospace'}}>{reply}</div>}
          </div>

          <div style={{flex:1,overflowY:'auto',padding:'8px'}}>
            <div style={{color:'#444',fontSize:'10px',letterSpacing:'1px',marginBottom:'6px',padding:'0 4px'}}>TRACKED ({list.length})</div>
            {list.map(ac=>{
              const c=ac.color??(ac.cooperative?'#3DDC97':'#FF4444'),p=Math.round(ac.confidence*100),s=sel?.icao===ac.icao;
              return(
                <div key={ac.icao} onClick={()=>focus(ac)}
                  style={{padding:'8px',marginBottom:'4px',background:s?'#1a2030':'#0D1117',border:`1px solid ${s?c+'55':'#1a2030'}`,borderRadius:'6px',cursor:'pointer'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'4px'}}>
                    <span style={{color:c,fontSize:'12px',fontWeight:600,fontFamily:'monospace'}}>{ac.is_ghost&&<span style={{opacity:0.5}}>◌ </span>}{ac.icao}</span>
                    <span style={{color:'#555',fontSize:'10px'}}>{ac.alt_ft.toLocaleString()}ft</span>
                  </div>
                  <div style={{height:'2px',background:'#1a2030',border-radius:'1px',overflow:hidden'}}>
                    <div style={{height:'100%',width:`${p}%`,background:p>=85?'#3DDC97':p>=65?'#FFB020':'#FF4444'}}/>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:'3px'}}>
                    <span style={{color:'#444',fontSize:'9px'}}>{ac.cooperative?'ADS-B':'MLAT'}</span>
                    <span style={{color:'#555',fontSize:'9px',fontFamily:'monospace'}}>{p}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{padding:'10px 12px',borderTop:'1px solid #1a2030',background:'#080B0F'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div><div style={{color:'#7B8FFF',fontSize:'10px',fontFamily:'monospace'}}>0.0.7968510</div><div style={{color:'#444',fontSize:'9px'}}>Hedera Testnet · HCS</div></div>
              <div style={{textAlign:'right'}}><div style={{color:'#3DDC97',fontSize:'10px',fontFamily:'monospace'}}>#{seq}</div><div style={{color:'#444',fontSize:'9px'}}>seq · live</div></div>
            </div>
          </div>
        </div>
      </div>

      <style>{`.leaflet-popup-content-wrapper,.leaflet-popup-tip{background:transparent!important;box-shadow:none!important;border:none!important;padding:0!important;}.leaflet-popup-content{margin:0!important;}.leaflet-popup-tip-container{display:none!important;}.leaflet-control-zoom a{background:#0D1117!important;color:#3DDC97!important;border-color:#1a2030!important;}`}</style>
    </div>
  );
}
