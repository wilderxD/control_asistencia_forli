import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api'
import { useState, useEffect } from 'react'

export default function Params(){
  const qc = useQueryClient()
  const { data, error, isLoading } = useQuery({ queryKey:['params'], queryFn: api.getParams })
  const [form, setForm] = useState<Record<string,string>>({ H1:'06:00', I1:'00:10', J1:'09:00', K1:'08:45' })
  const [msg, setMsg] = useState<{kind:''|'ok'|'err', text:string}>({kind:'', text:''})
  useEffect(()=>{ if(data){ const d=data as Record<string,string>; setForm({ H1:d.H1||'06:00', I1:d.I1||'00:10', J1:d.J1||'09:00', K1:d.K1||'08:45'}) } }, [data])
  const mut = useMutation({ mutationFn: ()=> api.setParams(form), onSuccess: (v)=> { qc.invalidateQueries({queryKey:['params']}); setMsg({kind:'ok', text:'Reglas guardadas.'}); void v }, onError: (e)=> setMsg({kind:'err', text: e instanceof Error? e.message:String(e)}) })

  if(isLoading) return <p className="help">Cargando reglas…</p>
  if(error) return <div className="status status--err" role="alert">No se pudieron cargar las reglas. {String(error)}</div>

  return <section>
    <h1 className="h1">Reglas</h1>
    <p className="sub">Tolerancia y duración de turno. Los cambios invalidan la caché 300s y se usan en el próximo cálculo de ruta.</p>

    <div className="card" style={{padding:16, display:'grid', gap:14, maxWidth:520}}>
      <div className="inline">
        {([
          ['H1','Límite tolerancia','Antes de H1 aplica I1'],
          ['I1','Tolerancia','Ej. 00:10'],
          ['J1','Jornada día','Ej. 09:00'],
          ['K1','Jornada noche','Ej. 08:45'],
        ] as const).map(([k,label,help])=> <label key={k} className="field" htmlFor={`p-${k}`}>{label}<input id={`p-${k}`} type="time" className="input mono" value={form[k]} onChange={e=> setForm(s=>({...s,[k]:e.target.value}))} /><span className="help">{help}</span></label>)}
      </div>
      <div style={{display:'flex', gap:8, alignItems:'center'}}>
        <button type="button" className="btn" onClick={()=>mut.mutate()} disabled={mut.isPending}>{mut.isPending?'Guardando…':'Guardar reglas'}</button>
        {msg.text && <span className={msg.kind==='err'?'err':'help'} role={msg.kind==='err'?'alert':'status'}>{msg.text}</span>}
      </div>
      <details><summary className="help" style={{cursor:'pointer'}}>Ver valores actuales</summary><pre className="mono" style={{whiteSpace:'pre-wrap', fontSize:12, marginTop:8}}>{JSON.stringify(data,null,2)}</pre></details>
    </div>
  </section>
}
