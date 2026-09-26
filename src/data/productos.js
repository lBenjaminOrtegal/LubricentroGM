import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const BUCKET_IMAGENES = 'productos';

// - categoria: 'auto', 'moto' o 'ambos' — determina en qué página aparece
//   cada producto (mundo-auto.astro, mundo-moto.astro, o ambas).
// - imagen_url: NO es la URL completa — es solo el nombre del archivo tal
//   como lo subiste al bucket de Supabase Storage (ej: "aceite-5w30.jpg").
//   El código de abajo arma la URL pública completa a partir de ese
//   nombre, así que si el día de mañana cambias de bucket o de proyecto,
//   no hay que editar cada fila de la tabla.

export async function obtenerProductos() {
  try {
    const { data, error } = await supabase
        .from('productos')
        .select('id, nombre, descripcion, precio, imagen_url, categoria');

    if (error) throw error;

    return (data ?? [])
        .map((fila) => {
          const archivo = fila.imagen_url?.trim() ?? '';
          const imagenUrl = archivo
              ? supabase.storage.from(BUCKET_IMAGENES).getPublicUrl(archivo).data.publicUrl
              : '';

          return {
            id: fila.id,
            nombre: fila.nombre?.trim() ?? '',
            descripcion: fila.descripcion?.trim() ?? '',
            precio: fila.precio ?? 0,
            imagenUrl,
            categoria: fila.categoria?.trim().toLowerCase() ?? 'ambos',
          };
        })
        .filter((p) => p.nombre && p.id != null);
  } catch (error) {
    console.error('[productos] No se pudo leer el catálogo desde Supabase:', error.message);
    return [];
  }
}