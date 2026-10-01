import {createClient} from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const BUCKET_IMAGENES = 'productos';

export async function obtenerProductos() {
    try {
        const {data, error} = await supabase
            .from('productos')
            .select('id, nombre, descripcion, precio, imagen_url, categoria')
            .order('id', { ascending: false });

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