const URL = (import.meta as unknown as { env: Record<string,string> }).env.VITE_APPS_SCRIPT_URL || '';

async function post<T>(action: string, payload: Record<string,unknown> = {}): Promise<T> {
  if (!URL) throw new Error('VITE_APPS_SCRIPT_URL no configurado');
  const res = await fetch(URL, { method: 'POST', body: JSON.stringify({ action, ...payload }) });
  const j = await res.json() as { success: boolean; data: T; error?: string; details?: unknown };
  if (!j.success) throw new Error(j.error || 'Error API');
  return j.data as T;
}

export type Maestro = { dni: string; nombre: string; empresa: string; cargo: string; turno: 'DIA'|'NOCHE'; horario: string; hora_ingreso_default: string; activo: boolean };
export type RutaRow = { placa: string; cargo: string; dni: string; tipo: string; cita_planta: string; destino?: string; personal?: string };
export type Resumen = { dni: string; nombre: string; total: number; tard: number; debe: number; porPagar: number; queDeben: number; turno: string; dias: Record<string,number> };

export const api = {
  getMaestro: () => post<Maestro[]>('getMaestro'),
  upsertMaestro: (row: Partial<Maestro>) => post('upsertMaestro', { row }),
  upsertRuta: (fecha: string, rows: RutaRow[]) => post('upsertRuta', { fecha, rows }),
  uploadAsistencia: (blob: string, fileName: string) => post<{count:number}>('uploadAsistencia', { blob, fileName }),
  getResumen: (fechaIni: string, fechaFin: string) => post<Resumen[]>('getResumen', { fechaIni, fechaFin }),
  getParams: () => post<Record<string,string>>('getParams'),
  setParams: (patch: Record<string,string>) => post<Record<string,string>>('setParams', { patch }),
  cerrarPeriodo: (fechaIni: string, fechaFin: string) => post<{count:number, periodo:string, ts:string}>('cerrarPeriodo', { fechaIni, fechaFin }),
  getPlanillaHistorial: (limit=20) => post<unknown[]>('getPlanillaHistorial', { limit }),
  exportRuta: (fecha: string) => post<{header:string[], data: string[][], count:number, drive?:{driveUrl:string}}>('exportRuta', { fecha }),
  exportHoras: (fechaIni: string, fechaFin: string) => post<{fechas:string[], resumen:Resumen[], drive?:{driveUrl:string}}>('exportHoras', { fechaIni, fechaFin }),
  getData: (fechaIni: string, fechaFin: string, limit=50, offset=0) => post<{total:number, data: unknown[]}>('getData', { fechaIni, fechaFin, limit, offset }),
};

export function toBase64(buf: ArrayBuffer) {
  let binary = ''; const bytes = new Uint8Array(buf);
  for (let i=0;i<bytes.byteLength;i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
