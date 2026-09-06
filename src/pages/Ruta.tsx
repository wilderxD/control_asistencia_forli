import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, type Maestro } from '../api'

type Tripulante = { cargo: string; dni: string }
type Placa = { placa: string; tipo: string; cita_planta: string; destino: string; personal: Tripulante[] }

const CARGOS = ['CHOFER','AUXILIAR1','AUXILIAR2','AYUDANTE DE DESPACHO','DESCANSO']
const TIPOS = ['TIENDAS','CD','TAPICERIA','FOLIOS','PLANTA','NOCHE','TRASLADO']

const newTripulante = (): Tripulante => ({ cargo:'AUXILIAR1', dni:'' })
const newPlaca = (): Placa => ({ placa:'', tipo:'TIENDAS', cita_planta:'05:00', destino:'', personal:[{ cargo:'CHOFER', dni:'' }] })

export default function Ruta() {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0,10))
  const [placas, setPlacas] = useState<Placa[]>([newPlaca()])
  const [msg, setMsg] = useState<{kind:'ok'|'err'|'', text:string}>({kind:'', text:''})
  const [saving, setSaving] = useState(false)
  const { data: maestro } = useQuery({ queryKey:['maestro'], queryFn: api.getMaestro })

  const maestroMap = useMemo(()=> {
    const m: Record<string, Maestro> = {}
    ;(maestro || []).forEach(p=> { m[p.dni] = p })
    return m
  }, [maestro])

  const updPlaca = (pi:number, k:string, v:string)=> setPlacas(s=> s.map((p,idx)=> idx===pi? {...p,[k]:v}:p))
  const updTrip = (pi:number, ti:number, k:string, v:string)=> setPlacas(s=> s.map((p,pidx)=> pidx!==pi? p : {...p, personal: p.personal.map((t,tidx)=> tidx===ti? {...t,[k]:v}:t)}))
  const addTrip = (pi:number)=> setPlacas(s=> s.map((p,idx)=> idx===pi? {...p, personal:[...p.personal, newTripulante()]}:p))
  const delTrip = (pi:number, ti:number)=> setPlacas(s=> s.map((p,idx)=> idx===pi? {...p, personal:p.personal.filter((_,i)=>i!==ti)}:p))
  const addPlaca = ()=> setPlacas(s=> [...s, newPlaca()])
  const delPlaca = (pi:number)=> setPlacas(s=> s.filter((_,idx)=> idx!==pi))

  const guardar = async()=>{
    const rows: {placa:string;cargo:string;dni:string;tipo:string;cita_planta:string;destino:string}[] = []
    for(const p of placas){
      if(!p.placa.trim()){ setMsg({kind:'err', text:'Falta la placa de una ruta.'}); return }
      if(!p.cita_planta){ setMsg({kind:'err', text:`Falta la cita en planta de la placa ${p.placa}.`}); return }
      for(const t of p.personal){
        if(!t.dni || !/^\d{8}(-\d)?$/.test(t.dni)){ setMsg({kind:'err', text:`Revisa DNI "${t.dni||'(vacío)'}" en placa ${p.placa}: 8 dígitos.`}); return }
        rows.push({ placa:p.placa.trim(), cargo:t.cargo, dni:t.dni, tipo:p.tipo, cita_planta:p.cita_planta, destino:p.destino.trim() })
      }
    }
    setSaving(true); setMsg({kind:'', text:''})
    try { const r = await api.upsertRuta(fecha, rows as never); setMsg({kind:'ok', text:`Ruta del ${fecha} guardada — ${(r as {count:number}).count} tripulantes en ${placas.length} placa(s).`}) } catch(e){ setMsg({kind:'err', text: e instanceof Error? e.message:String(e)}) } finally{ setSaving(false)}
  }
  const descargar = async()=>{
    setMsg({kind:'', text:'Generando archivo…'})
    try {
      const { header, data, drive } = await api.exportRuta(fecha) as {header:string[], data:string[][], drive?:{driveUrl:string}}
      if(drive?.driveUrl){ window.open(drive.driveUrl,'_blank'); setMsg({kind:'ok', text:'Plantilla Drive abierta.'}); return }
      const { utils, writeFile } = await import('xlsx')
      const ws = utils.aoa_to_sheet([header, ...data])
      const wb = utils.book_new(); utils.book_append_sheet(wb, ws, 'DATA')
      writeFile(wb, `RUTA${fecha.replace(/-/g,'')}.xlsx`)
      setMsg({kind:'ok', text:'Archivo descargado.'})
    } catch(e){ setMsg({kind:'err', text: e instanceof Error? e.message:String(e)}) }
  }

  return (
    <section>
      <h1 className="h1">Ruta del día</h1>
      <p className="sub">Cada placa agrupa un chofer y sus auxiliares. La cita en planta es la hora programada; las marcas <span className="kbd">K/O</span> las pone la asistencia.</p>

      <div className="inline" style={{marginBottom:14}}>
        <label className="field" htmlFor="r-fecha">Fecha<input id="r-fecha" type="date" className="input mono" value={fecha} onChange={e=>setFecha(e.target.value)} /></label>
        <span className="help" style={{alignSelf:'center'}}>Se guarda como <span className="mono">{fecha}</span></span>
      </div>

      {placas.map((p, pi)=> (
        <div key={pi} className="card" style={{padding:14, marginBottom:14, borderLeft:`3px solid var(--ink)`}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
            <strong style={{fontSize:13}}>Placa {pi+1}</strong>
            <button type="button" className="btn btn--ghost" onClick={()=>delPlaca(pi)} disabled={placas.length===1}>Quitar placa</button>
          </div>
          <div className="inline" style={{alignItems:'end'}}>
            <label className="field" htmlFor={`p-placa-${pi}`}>Placa<input id={`p-placa-${pi}`} className="input mono" value={p.placa} onChange={e=>updPlaca(pi,'placa',e.target.value)} placeholder="AAH-815" style={{width:110}} /></label>
            <label className="field" htmlFor={`p-tipo-${pi}`}>Tipo<select id={`p-tipo-${pi}`} value={p.tipo} onChange={e=>updPlaca(pi,'tipo',e.target.value)}>{TIPOS.map(t=> <option key={t}>{t}</option>)}</select></label>
            <label className="field" htmlFor={`p-cita-${pi}`}>Cita en planta<input id={`p-cita-${pi}`} type="time" className="input mono" value={p.cita_planta} onChange={e=>updPlaca(pi,'cita_planta',e.target.value)} /></label>
            <label className="field" htmlFor={`p-dest-${pi}`}>Destino<input id={`p-dest-${pi}`} className="input" value={p.destino} onChange={e=>updPlaca(pi,'destino',e.target.value)} placeholder="Destino" /></label>
          </div>

          <div className="table-wrap" role="region" aria-label={`Tripulantes de placa ${p.placa || pi+1}`} tabIndex={0}>
            <table>
              <thead><tr><th scope="col">Cargo</th><th scope="col" className="mono">DNI</th><th scope="col">Nombre</th><th scope="col" style={{width:40}}><span style={{position:'absolute', left:-9999}}>Acciones</span></th></tr></thead>
              <tbody>{p.personal.map((t, ti)=> <tr key={ti}>
                <td><select value={t.cargo} onChange={e=>updTrip(pi,ti,'cargo',e.target.value)} aria-label={`Cargo ${ti+1}`}>{CARGOS.map(c=> <option key={c}>{c}</option>)}</select></td>
                <td><input className="input mono" value={t.dni} onChange={e=>updTrip(pi,ti,'dni',e.target.value)} placeholder="71278074" style={{width:118}} aria-label={`DNI ${ti+1}`} aria-invalid={!!t.dni && !/^\d{8}(-\d)?$/.test(t.dni)} /></td>
                <td className="help" style={{whiteSpace:'nowrap'}}>{t.dni && /^\d{8}(-\d)?$/.test(t.dni) ? (maestroMap[t.dni]?.nombre || 'No está en personal') : '—'}</td>
                <td><button type="button" className="btn btn--ghost" onClick={()=>delTrip(pi,ti)} disabled={p.personal.length===1} aria-label={`Quitar ${t.dni||'tripulante'}`}>✕</button></td>
              </tr>)}</tbody>
            </table>
          </div>
          <div style={{marginTop:8}}>
            <button type="button" className="btn btn--ghost" onClick={()=>addTrip(pi)}>+ Añadir auxiliar</button>
          </div>
        </div>
      ))}

      <div style={{marginTop:8, display:'flex', gap:8, flexWrap:'wrap'}}>
        <button type="button" className="btn btn--ghost" onClick={addPlaca}>+ Agregar placa</button>
        <button type="button" className="btn" onClick={guardar} disabled={saving}>{saving?'Guardando…':'Guardar ruta del día'}</button>
        <button type="button" className="btn btn--ghost" onClick={descargar}>Descargar RUTA</button>
      </div>
      {msg.text && <div className={`status ${msg.kind==='err'?'status--err': msg.kind==='ok'?'status--ok':''}`} role={msg.kind==='err'?'alert':'status'} style={{marginTop:10}}>{msg.text}</div>}
    </section>
  )
}