import { useState, useRef } from 'react'
import { api, toBase64 } from '../api'

export default function Horas(){
  const [ini, setIni] = useState('2026-08-26')
  const [fin, setFin] = useState('2026-09-10')
  const [resumen, setResumen] = useState<unknown[]|null>(null)
  const [msg, setMsg] = useState<{kind:''|'ok'|'err', text:string}>({kind:'', text:''})
  const [busy, setBusy] = useState<''|'upload'|'resumen'|'cerrar'|'export'>('')
  const dlgRef = useRef<HTMLDialogElement>(null)

  const onFile = async(e: React.ChangeEvent<HTMLInputElement>)=>{
    const f = e.target.files?.[0]; if(!f) return
    setBusy('upload'); setMsg({kind:'', text:`Subiendo ${f.name}…`})
    const buf = await f.arrayBuffer()
    const b64 = toBase64(buf)
    try { const r = await api.uploadAsistencia(b64, f.name) as {count:number}; setMsg({kind:'ok', text:`Asistencia cargada — ${r.count} registros calculados.`}) } catch(err){ setMsg({kind:'err', text: err instanceof Error? 'No se pudo procesar la asistencia. Revisa que sea el archivo Asistencia_*.xlsx y vuelve a intentar.': String(err)}) } finally{ setBusy(''); (e.target as HTMLInputElement).value=''}
  }
  const cargarResumen = async()=>{
    setBusy('resumen'); setMsg({kind:'', text:''})
    try { const r = await api.getResumen(ini, fin); setResumen(r as unknown[]); setMsg({kind:'ok', text:`Planilla cargada — ${(r as unknown[]).length} personas en el periodo.`}) } catch(e){ setMsg({kind:'err', text: e instanceof Error? e.message:String(e)}) } finally{ setBusy('')}
  }
  const confirmarCerrar = ()=> dlgRef.current?.showModal()
  const cerrar = async()=>{
    dlgRef.current?.close(); setBusy('cerrar'); setMsg({kind:'', text:''})
    try { const r = await api.cerrarPeriodo(ini, fin) as {count:number, periodo:string}; setMsg({kind:'ok', text:`Planilla cerrada — ${r.count} personas congeladas.`}) } catch(e){ setMsg({kind:'err', text: e instanceof Error? e.message:String(e)}) } finally{ setBusy('')}
  }
  const descargar = async()=>{
    setBusy('export'); setMsg({kind:'', text:''})
    try {
      const { fechas, resumen:res, drive } = await api.exportHoras(ini, fin) as {fechas:string[], resumen: {dni:string,nombre:string,total:number,porPagar:number, queDeben:number, dias:Record<string,number>}[], drive?:{driveUrl:string}}
      if (drive?.driveUrl) { window.open(drive.driveUrl, '_blank'); setMsg({kind:'ok', text:'Plantilla Drive abierta en una pestaña nueva.'}); return }
      const { utils, writeFile } = await import('xlsx')
      const header = ['DNI','Nombre','Cargo','Turno', ...fechas, 'Total','Por pagar','Que deben']
      const rows = (res as unknown as {dni:string,nombre:string,cargo:string,turno:string, total:number, porPagar:number, queDeben:number, dias:Record<string,number>}[]).map(r=> [r.dni, r.nombre, r.cargo, r.turno, ...fechas.map(f=> r.dias[f] ? (r.dias[f]/60).toFixed(2): '0'), (r.total/60).toFixed(2), (r.porPagar/60).toFixed(2), (r.queDeben/60).toFixed(2)])
      const ws = utils.aoa_to_sheet([header, ...rows]); const wb = utils.book_new(); utils.book_append_sheet(wb, ws, 'Planilla'); writeFile(wb, `Horas extra ${ini} al ${fin}.xlsx`)
      setMsg({kind:'ok', text:'Archivo descargado.'})
    } catch(e){ setMsg({kind:'err', text: e instanceof Error? e.message:String(e)}) } finally{ setBusy('')}
  }

  const sumPorPagar = resumen ? (resumen as {porPagar:number}[]).reduce((s,r)=> s+r.porPagar, 0) : 0
  const sumQueDeben = resumen ? (resumen as {queDeben:number}[]).reduce((s,r)=> s+r.queDeben, 0) : 0

  return (
    <section>
      <h1 className="h1">Planilla</h1>
      <p className="sub">Sube el archivo de asistencia, elige un periodo y genera la planilla. Cerrar congela el periodo en el historial.</p>

      <div className="inline" style={{alignItems:'end'}}>
        <label className="field" htmlFor="h-file">Asistencia<input id="h-file" type="file" accept=".xlsx" onChange={onFile} disabled={busy==='upload'} className="input" /></label>
        <label className="field" htmlFor="h-ini">Desde<input id="h-ini" type="date" className="input mono" value={ini} onChange={e=>setIni(e.target.value)} /></label>
        <label className="field" htmlFor="h-fin">Hasta<input id="h-fin" type="date" className="input mono" value={fin} onChange={e=>setFin(e.target.value)} /></label>
        <button type="button" className="btn" onClick={cargarResumen} disabled={busy==='resumen'}>{busy==='resumen'?'Cargando…':'Ver planilla'}</button>
        <button type="button" className="btn btn--flag" onClick={confirmarCerrar} disabled={!resumen || busy==='cerrar'}>{busy==='cerrar'?'Cerrando…':'Cerrar planilla'}</button>
        <button type="button" className="btn btn--ghost" onClick={descargar} disabled={busy==='export'}>{busy==='export'?'Generando…':'Descargar archivo'}</button>
      </div>

      {busy==='upload' && <p className="help" aria-live="polite">Subiendo y calculando…</p>}
      {msg.text && <div className={`status ${msg.kind==='err'?'status--err': msg.kind==='ok'?'status--ok':''}`} role={msg.kind==='err'?'alert':'status'} style={{marginTop:10}}>{msg.text}</div>}

      {resumen && (
        <div className="hero" aria-label="Totales del periodo">
          <div className="hero__cell"><div className="hero__label">Por pagar</div><div className="hero__value mono">{(sumPorPagar/60).toFixed(2)} h</div></div>
          <div className="hero__cell"><div className="hero__label">Que deben</div><div className="hero__value mono" style={{color: sumQueDeben? 'var(--flag)':undefined}}>{(sumQueDeben/60).toFixed(2)} h</div></div>
        </div>
      )}

      {resumen ? (
        resumen.length===0 ? <p className="help" role="status">Aún no hay asistencia para este periodo. Sube el archivo Asistencia_*.xlsx para calcular horas.</p> :
        <div className="table-wrap" role="region" aria-label="Planilla por persona" tabIndex={0}>
          <table>
            <caption style={{position:'absolute', left:-9999}}>Planilla — por pagar por persona</caption>
            <thead><tr><th scope="col" className="mono">DNI</th><th scope="col">Nombre</th><th scope="col" className="num">Total</th><th scope="col" className="num">Por pagar</th><th scope="col" className="num">Que deben</th><th scope="col">Turno</th></tr></thead>
            <tbody>{(resumen as {dni:string,nombre:string,total:number,porPagar:number,queDeben:number,turno:string}[]).slice(0,120).map(r=> <tr key={r.dni}><td className="mono">{r.dni}</td><td>{r.nombre}</td><td className="num mono">{(r.total/60).toFixed(2)}</td><td className="num mono">{(r.porPagar/60).toFixed(2)}</td><td className="num mono" style={{color: r.queDeben? 'var(--flag)':undefined}}>{(r.queDeben/60).toFixed(2)}</td><td>{r.turno}</td></tr>)}</tbody>
          </table>
        </div>
      ) : null}
      {resumen && (resumen as unknown[]).length>120 && <p className="help">… y {(resumen as unknown[]).length-120} personas más (descarga el archivo para el listado completo).</p>}

      <dialog ref={dlgRef} aria-label="Confirmar cierre de planilla">
        <div className="dlg__head">¿Cerrar planilla?</div>
        <div className="dlg__body">Se congelará el periodo <span className="mono">{ini} al {fin}</span> en el historial y quedará como versión a pagar. Esta acción se registra en auditoría.</div>
        <div className="dlg__foot">
          <button type="button" className="btn btn--ghost" onClick={()=> dlgRef.current?.close()}>Cancelar</button>
          <button type="button" className="btn btn--flag" onClick={cerrar}>Cerrar planilla</button>
        </div>
      </dialog>
    </section>
  )
}
