import { useState } from 'react'
import { api } from '../api'

const CARGOS = ['CHOFER','AYUDANTE DE DESPACHO','ADMIN','ALMACEN / ENCAR.TARIMAS']
const TIPOS = ['TIENDAS','CD','TAPICERIA','FOLIOS','PLANTA','NOCHE','TRASLADO']

export default function Ruta() {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0,10))
  const [rows, setRows] = useState<{placa:string,cargo:string,dni:string,tipo:string,cita_planta:string,destino:string}[]>([{placa:'',cargo:'',dni:'',tipo:'RUTA',cita_planta:'05:00',destino:''}])
  const [msg, setMsg] = useState<{kind:'ok'|'err'|'', text:string}>({kind:'', text:''})
  const [saving, setSaving] = useState(false)

  const upd = (i:number, k:string, v:string)=> setRows(s=> s.map((r,idx)=> idx===i? {...r,[k]:v}:r))
  const add = ()=> setRows(s=>[...s,{placa:'',cargo:'',dni:'',tipo:'RUTA',cita_planta:'05:00',destino:''}])

  const guardar = async()=>{
    for(const r of rows){ if(!r.dni || !/^\d{8}(-\d)?$/.test(r.dni)){ setMsg({kind:'err', text:`Revisa DNI "${r.dni}": 8 dígitos.`}); return } }
    setSaving(true); setMsg({kind:'', text:''})
    try { const r = await api.upsertRuta(fecha, rows as never); setMsg({kind:'ok', text:`Ruta del ${fecha} guardada — ${ (r as {count:number}).count} filas.`}) } catch(e){ setMsg({kind:'err', text: e instanceof Error? e.message:String(e)}) } finally{ setSaving(false)}
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
      <p className="sub">Cita en planta es la hora programada. Solo se escribe a planilla <span className="kbd">I</span> y datos de ruta; las marcas <span className="kbd">K/O</span> las pone la asistencia.</p>

      <div className="inline" style={{marginBottom:12}}>
        <label className="field" htmlFor="r-fecha">Fecha<input id="r-fecha" type="date" className="input mono" value={fecha} onChange={e=>setFecha(e.target.value)} /></label>
        <span className="help" style={{alignSelf:'center'}}>Se guarda como <span className="mono">{fecha}</span></span>
      </div>

      <div className="table-wrap" role="region" aria-label="Ruta del día" tabIndex={0}>
        <table>
          <thead><tr><th scope="col">Placa</th><th scope="col">Cargo</th><th scope="col" className="mono">DNI</th><th scope="col">Tipo</th><th scope="col" className="num">Cita en planta</th><th scope="col">Destino</th></tr></thead>
          <tbody>{rows.map((r,i)=> <tr key={i}>
            <td><input className="input mono" value={r.placa} onChange={e=>upd(i,'placa',e.target.value)} placeholder="AAH-815" style={{width:110}} aria-label="Placa" /></td>
            <td><select value={r.cargo} onChange={e=>upd(i,'cargo',e.target.value)} aria-label="Cargo"><option value="">—</option>{CARGOS.map(c=> <option key={c}>{c}</option>)}</select></td>
            <td><input className="input mono" value={r.dni} onChange={e=>upd(i,'dni',e.target.value)} placeholder="71278074" style={{width:118}} aria-label="DNI" aria-invalid={!!r.dni && !/^\d{8}(-\d)?$/.test(r.dni)} /></td>
            <td><select value={r.tipo} onChange={e=>upd(i,'tipo',e.target.value)} aria-label="Tipo despacho">{TIPOS.map(t=> <option key={t}>{t}</option>)}</select></td>
            <td style={{textAlign:'right'}}><input type="time" className="input mono" value={r.cita_planta} onChange={e=>upd(i,'cita_planta',e.target.value)} aria-label="Cita en planta" /></td>
            <td><input className="input" value={r.destino} onChange={e=>upd(i,'destino',e.target.value)} placeholder="Destino" aria-label="Destino" /></td>
          </tr>)}
          </tbody>
        </table>
      </div>

      <div style={{marginTop:12, display:'flex', gap:8, flexWrap:'wrap'}}>
        <button type="button" className="btn btn--ghost" onClick={add}>Añadir fila</button>
        <button type="button" className="btn" onClick={guardar} disabled={saving}>{saving?'Guardando…':'Guardar ruta del día'}</button>
        <button type="button" className="btn btn--ghost" onClick={descargar}>Descargar RUTA</button>
      </div>
      {msg.text && <div className={`status ${msg.kind==='err'?'status--err': msg.kind==='ok'?'status--ok':''}`} role={msg.kind==='err'?'alert':'status'} style={{marginTop:10}}>{msg.text}</div>}
    </section>
  )
}
