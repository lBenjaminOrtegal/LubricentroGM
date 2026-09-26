import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

export async function obtenerServicios() {
  try {
    const { data, error } = await supabase
        .from('servicios')
        .select('id, nombre, descripcion, precio_minimo');

    if (error) throw error;

    return (data ?? [])
        .map((fila) => ({
            id: fila.id,
            nombre: fila.nombre?.trim() ?? '',
            descripcion: fila.descripcion?.trim() ?? '',
            precioMinimo: fila.precio_minimo ?? 0,
        }))
        .filter((s) => s.nombre && s.id != null);
  } catch (error) {
    console.error('[servicios] No se pudo leer el catálogo desde Supabase:', error.message);
    return [];
  }
}