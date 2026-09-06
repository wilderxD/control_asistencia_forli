import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { useState } from 'react'

export default function Maestro() {
  const qc = useQueryClient()
  const { data, isLoading, error } = useQuery({ queryKey: ['maestro'], queryFn: api.getMaestro })
  const [form, setForm] = useState<Record<string,string>>({ dni:'', nombre:'', empresa:'FORLI', cargo:'AYUDANTE DE DESPACHO', turno:'DIA', horario:'RUTA', hora_ingreso_default:'05:00' })
  const [fieldErr, setFieldErr] = useState<string>('')
  const mut = useMutation({ mutationFn: () => api.upsertMaestro(form), onSuccess: ()=> { setFieldErr(''); qc.invalidateQueries({queryKey:['maestro']}) }, onError: (e: unknown)=> setFieldErr(e instanceof Error ? e.message : String(e)) })
  const isDniInvalid = form.dni !== '' && !/^\d{8}(-\d)?$/.test(form.dni)

  if (isLoading) return <p className="help">Cargando personal…</p>
  if (error) return <div className="status status--err" role="alert">No se pudo cargar el personal. Verifica la conexión con Apps Script y vuelve a intentar. <span className="help">{String(error)}</span></div>

  return (
    <section>
      <h1 className="h1">Personal</h1>
      <p className="sub">Maestro de 106 personas (PK DNI). Se carga una vez y se reutiliza en ruta y planilla.</p>

      <div className="table-wrap" role="region" aria-label="Tabla de personal" tabIndex={0}>
        <table>
          <caption style={{position:'absolute', left:-9999}}>Personal activo</caption>
          <thead><tr><th scope="col" className="mono">DNI</th><th scope="col">Nombre</th><th scope="col">Empresa</th><th scope="col">Cargo</th><th scope="col">Turno</th><th scope="col">Horario</th><th scope="col" className="num">Hora prog</th></tr></thead>
          <tbody>{data?.map(r=> <tr key={r.dni}><td className="mono">{r.dni}</td><td>{r.nombre}</td><td>{r.empresa}</td><td>{r.cargo}</td><td>{r.turno}</td><td>{r.horario}</td><td className="num mono">{(r as unknown as {hora_prog?:string}).hora_prog || r.hora_ingreso_default || '—'}</td></tr>)}
            {!data?.length && <tr><td colSpan={7} className="help">Sin personal. Importa la planilla o añade el primero abajo.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2 style={{fontSize:14, margin:'20px 0 8px'}}>Alta o edición</h2>
      <form onSubmit={e=>{ e.preventDefault(); if(isDniInvalid) return; mut.mutate() }} noValidate>
        <div className="inline">
          <label className="field" htmlFor="m-dni">DNI
            <input id="m-dni" className="input mono" value={form.dni} onChange={e=> setForm(s=>({...s,dni:e.target.value}))} onBlur={()=>{ if(form.dni && isDniInvalid) setFieldErr('DNI: 8 dígitos, ej. 71278074') }} aria-invalid={isDniInvalid} aria-describedby={isDniInvalid ? 'm-dni-err' : undefined} placeholder="71278074" />
          </label>
          <label className="field" htmlFor="m-nom">Nombre<input id="m-nom" className="input" value={form.nombre} onChange={e=> setForm(s=>({...s,nombre:e.target.value}))} /></label>
          <label className="field">Empresa<select value={form.empresa} onChange={e=> setForm(s=>({...s,empresa:e.target.value}))}><option>FORLI</option><option>SURYMAR</option><option>MUNDIAL</option></select></label>
          <label className="field">Turno<select value={form.turno} onChange={e=> setForm(s=>({...s,turno:e.target.value}))}><option>DIA</option><option>NOCHE</option></select></label>
          <label className="field">Hora prog<input type="time" className="input mono" value={form.hora_ingreso_default} onChange={e=> setForm(s=>({...s,hora_ingreso_default:e.target.value}))} /></label>
        </div>
        {isDniInvalid && <p id="m-dni-err" className="err" role="alert">Revisa el DNI: 8 dígitos, ej. 71278074</p>}
        <div style={{marginTop:12, display:'flex', gap:8, alignItems:'center'}}>
          <button type="submit" className="btn" disabled={mut.isPending || isDniInvalid}>{mut.isPending?'Guardando…':'Guardar personal'}</button>
          {fieldErr && !isDniInvalid && <span className="err" role="alert">{fieldErr}</span>}
          {mut.isSuccess && <span className="status">Guardado</span>}
        </div>
      </form>
    </section>
  )
}
