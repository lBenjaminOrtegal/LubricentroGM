import {useState, useEffect, useMemo} from 'react';
import {supabase} from '@/lib/supabase';
import {comprimirYConvertirAWebP} from '@/lib/imageOptimizer.js';

const VALORES_DEFECTO_PRODUCTO = {
    id: null,
    nombre: '',
    descripcion: '',
    precio: '',
    categoria: 'ambos',
    imagen_url: '',
    stock: 1
};

const VALORES_DEFECTO_SERVICIO = {
    id: null,
    nombre: '',
    descripcion: '',
    precio_minimo: ''
};

export default function AdminPanel() {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorLogin, setErrorLogin] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);

    const [vista, setVista] = useState('productos');

    const [productos, setProductos] = useState([]);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [subiendoImagen, setSubiendoImagen] = useState(false);
    const [archivoImagen, setArchivoImagen] = useState(null);
    const [previsualizacion, setPrevisualizacion] = useState('');

    const [productoActual, setProductoActual] = useState(VALORES_DEFECTO_PRODUCTO);

    const [busqueda, setBusqueda] = useState('');
    const [filtroCategoria, setFiltroCategoria] = useState('todas');

    const [servicios, setServicios] = useState([]);
    const [modoEdicionServicio, setModoEdicionServicio] = useState(false);
    const [guardandoServicio, setGuardandoServicio] = useState(false);
    const [servicioActual, setServicioActual] = useState(VALORES_DEFECTO_SERVICIO);
    const [busquedaServicios, setBusquedaServicios] = useState('');

    const obtenerUrlPublica = (img) => {
        if (!img) return '';
        if (img.startsWith('http://') || img.startsWith('https://')) return img;
        return supabase.storage.from('productos').getPublicUrl(img).data.publicUrl;
    };

    useEffect(() => {
        supabase.auth.getSession().then(({data: {session}}) => {
            setSession(session);
            setLoading(false);
        });

        const {data: {subscription}} = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (session) {
            cargarProductos();
            cargarServicios();
        }
    }, [session]);

    const cargarProductos = async () => {
        const {data, error} = await supabase.from('productos').select('*').order('id', {ascending: false});
        if (!error) setProductos(data || []);
    };

    const cargarServicios = async () => {
        const {data, error} = await supabase.from('servicios').select('*').order('id', {ascending: false});
        if (!error) setServicios(data || []);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorLogin('');
        setLoginLoading(true);
        const {error} = await supabase.auth.signInWithPassword({email, password});
        if (error) setErrorLogin('Credenciales inválidas o no autorizadas.');
        setLoginLoading(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const handleSeleccionarImagen = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setArchivoImagen(file);
            setPrevisualizacion(URL.createObjectURL(file));
        }
    };

    const subirImagenStorage = async (file) => {
        const blobWebP = await comprimirYConvertirAWebP(file, 1200, 0.75);

        const fileName = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.webp`;

        const { error: uploadError } = await supabase.storage
            .from('productos')
            .upload(fileName, blobWebP, {
                contentType: 'image/webp',
                cacheControl: '31536000',
                upsert: true,
            });

        if (uploadError) throw uploadError;

        return fileName;
    };

    const eliminarImagenStorage = async (imagenUrl) => {
        if (!imagenUrl) return;
        try {
            const fileName = imagenUrl.includes('/productos/')
                ? imagenUrl.split('/productos/').pop()
                : imagenUrl;
            if (fileName) {
                await supabase.storage.from('productos').remove([fileName]);
            }
        } catch (err) {
            console.error('Error al borrar imagen antigua:', err);
        }
    };

    const handleSubmitProducto = async (e) => {
        e.preventDefault();
        setSubiendoImagen(true);

        try {
            let finalFileName = productoActual.imagen_url;

            if (archivoImagen) {
                if (modoEdicion && productoActual.imagen_url) {
                    await eliminarImagenStorage(productoActual.imagen_url);
                }
                finalFileName = await subirImagenStorage(archivoImagen);
            }

            const payload = {
                nombre: productoActual.nombre.trim(),
                descripcion: productoActual.descripcion?.trim() || '',
                precio: Number(productoActual.precio),
                categoria: productoActual.categoria,
                imagen_url: finalFileName,
                stock: Number(productoActual.stock)
            };

            if (modoEdicion) {
                const {error} = await supabase.from('productos').update(payload).eq('id', productoActual.id);
                if (error) alert('Error al actualizar: ' + error.message);
            } else {
                const {error} = await supabase.from('productos').insert([payload]);
                if (error) alert('Error al crear: ' + error.message);
            }

            resetFormulario();
            cargarProductos();
        } catch (error) {
            alert('Error en el proceso: ' + error.message);
        } finally {
            setSubiendoImagen(false);
        }
    };

    const handleEditar = (p) => {
        setModoEdicion(true);
        setProductoActual(p);
        setPrevisualizacion(obtenerUrlPublica(p.imagen_url));
        setArchivoImagen(null);
        window.scrollTo({top: 0, behavior: 'smooth'});
    };

    const handleEliminar = async (id, imagenUrl) => {
        if (confirm('¿Estás seguro de eliminar este producto y su imagen?')) {
            const {error} = await supabase.from('productos').delete().eq('id', id);
            if (error) {
                alert('Error al eliminar: ' + error.message);
            } else {
                if (imagenUrl) await eliminarImagenStorage(imagenUrl);
                cargarProductos();
            }
        }
    };

    const resetFormulario = () => {
        setModoEdicion(false);
        setArchivoImagen(null);
        setPrevisualizacion('');
        setProductoActual(VALORES_DEFECTO_PRODUCTO);
    };

    const handleSubmitServicio = async (e) => {
        e.preventDefault();
        setGuardandoServicio(true);

        try {
            const payload = {
                nombre: servicioActual.nombre.trim(),
                descripcion: servicioActual.descripcion?.trim() || '',
                precio_minimo: servicioActual.precio_minimo.trim(),
            };

            if (modoEdicionServicio) {
                const {error} = await supabase.from('servicios').update(payload).eq('id', servicioActual.id);
                if (error) alert('Error al actualizar: ' + error.message);
            } else {
                const {error} = await supabase.from('servicios').insert([payload]);
                if (error) alert('Error al crear: ' + error.message);
            }

            resetFormularioServicio();
            cargarServicios();
        } catch (error) {
            alert('Error en el proceso: ' + error.message);
        } finally {
            setGuardandoServicio(false);
        }
    };

    const handleEditarServicio = (s) => {
        setModoEdicionServicio(true);
        setServicioActual(s);
        window.scrollTo({top: 0, behavior: 'smooth'});
    };

    const handleEliminarServicio = async (id) => {
        if (confirm('¿Estás seguro de eliminar este servicio?')) {
            const {error} = await supabase.from('servicios').delete().eq('id', id);
            if (error) {
                alert('Error al eliminar: ' + error.message);
            } else {
                cargarServicios();
            }
        }
    };

    const resetFormularioServicio = () => {
        setModoEdicionServicio(false);
        setServicioActual(VALORES_DEFECTO_SERVICIO);
    };

    const productosFiltrados = useMemo(() => {
        const query = busqueda.trim().toLowerCase();
        return productos.filter((p) => {
            const coincideCat = filtroCategoria === 'todas' || p.categoria === filtroCategoria;
            const coincideTexto =
                !query ||
                (p.nombre && p.nombre.toLowerCase().includes(query)) ||
                (p.descripcion && p.descripcion.toLowerCase().includes(query));
            return coincideCat && coincideTexto;
        });
    }, [productos, busqueda, filtroCategoria]);

    const serviciosFiltrados = useMemo(() => {
        const query = busquedaServicios.trim().toLowerCase();
        return servicios.filter((s) => {
            return (
                !query ||
                (s.nombre && s.nombre.toLowerCase().includes(query)) ||
                (s.descripcion && s.descripcion.toLowerCase().includes(query))
            );
        });
    }, [servicios, busquedaServicios]);

    if (loading) {
        return (
            <div className="flex min-h-100 flex-col items-center justify-center gap-3">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"/>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Verificando sesión...</span>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-xl">
                    <div className="text-center">
                        <h2 className="mt-3 text-2xl font-black uppercase tracking-tight text-foreground">
                            Panel de Control
                        </h2>
                        <p className="mt-1 text-md text-muted-foreground">Ingresa con tu correo y contraseña
                            autorizados.</p>
                    </div>

                    {errorLogin && (
                        <div
                            className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium text-red-500">
                            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                 strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            <span>{errorLogin}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="mt-6 space-y-4">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Correo
                                Electrónico</label>
                            <input
                                type="email"
                                required
                                placeholder="admin@correo.cl"
                                className="mt-1.5 w-full rounded-lg border bg-background px-3.5 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div>
                            <label
                                className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contraseña</label>
                            <input
                                type="password"
                                required
                                placeholder="••••••••"
                                className="mt-1.5 w-full rounded-lg border bg-background px-3.5 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loginLoading}
                            className="cursor-pointer mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2 text-md font-bold tracking-wider text-primary-foreground shadow transition hover:opacity-90 disabled:opacity-50"
                        >
                            {loginLoading ? 'Validando...' : 'Ingresar'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
                        Panel de Administración
                    </h1>
                </div>
                <button
                    onClick={handleLogout}
                    className="cursor-pointer inline-flex items-center gap-2 self-start rounded-lg border border-border bg-card px-4 py-2 text-xs font-bold uppercase tracking-wider text-foreground shadow-sm transition hover:bg-muted hover:text-foreground"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round"
                              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                    </svg>
                    Cerrar Sesión
                </button>
            </div>

            {/* Selector de pestaña: Productos / Servicios */}
            <div className="inline-flex rounded-lg border bg-card p-1">
                <button
                    onClick={() => setVista('productos')}
                    className={`cursor-pointer rounded-md px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                        vista === 'productos' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    Productos
                </button>
                <button
                    onClick={() => setVista('servicios')}
                    className={`cursor-pointer rounded-md px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                        vista === 'servicios' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    Servicios
                </button>
            </div>

            {vista === 'productos' ? (
                <>
                    <div className="rounded-2xl border bg-card p-6 shadow-sm">
                        <div className="mb-6 flex items-center justify-between border-b pb-4">
                            <div className="flex items-center gap-2">
                                <h2 className="text-md font-extrabold uppercase tracking-wide text-foreground">
                                    {modoEdicion ? `Editar: ${productoActual.nombre || 'Producto'}` : 'Agregar Producto'}
                                </h2>
                            </div>
                            {modoEdicion && (
                                <button
                                    type="button"
                                    onClick={resetFormulario}
                                    className="cursor-pointer text-sm font-semibold text-muted-foreground underline underline-offset-4 hover:text-foreground"
                                >
                                    Cancelar Edición
                                </button>
                            )}
                        </div>

                        <form onSubmit={handleSubmitProducto} className="grid gap-5 sm:grid-cols-3">
                            <div className="sm:col-span-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nombre del
                                    Producto</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: Kit de Luces LED"
                                    className="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    value={productoActual.nombre}
                                    onChange={(e) => setProductoActual({...productoActual, nombre: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Categoría</label>
                                <select
                                    className="cursor-pointer mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    value={productoActual.categoria}
                                    onChange={(e) => setProductoActual({...productoActual, categoria: e.target.value})}
                                >
                                    <option value="ambos">Ambos</option>
                                    <option value="auto">Auto</option>
                                    <option value="moto">Moto</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Precio ($CLP)</label>
                                <div className="relative mt-1.5">
                            <span
                                className="pointer-events-none absolute left-3 top-2 text-sm font-bold text-muted-foreground">$</span>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        placeholder="19990"
                                        className="w-full rounded-lg border bg-background py-2 pl-7 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                        value={productoActual.precio}
                                        onChange={(e) => setProductoActual({...productoActual, precio: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Stock</label>
                                <input
                                    type="number"
                                    min="0"
                                    required
                                    className="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    value={productoActual.stock}
                                    onChange={(e) => setProductoActual({...productoActual, stock: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Imagen del Producto</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm file:mr-2 file:font-semibold"
                                    onChange={handleSeleccionarImagen}
                                />
                            </div>

                            <div className="sm:col-span-3">
                                <label
                                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descripción</label>
                                <textarea
                                    className="mt-1.5 w-full rounded-lg border bg-background p-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    rows={4}
                                    placeholder="Detalles sobre características, compatibilidad, garantía..."
                                    value={productoActual.descripcion || ''}
                                    onChange={(e) => setProductoActual({...productoActual, descripcion: e.target.value})}
                                />
                            </div>

                            {previsualizacion && (
                                <div className="sm:col-span-3 flex items-center gap-4 rounded-xl border bg-muted/20 p-3">
                                    <img
                                        src={previsualizacion}
                                        alt="Vista previa"
                                        className="h-14 w-14 shrink-0 rounded-lg border object-cover shadow-sm"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-foreground">Imagen Seleccionada</p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {archivoImagen ? archivoImagen.name : productoActual.imagen_url}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setArchivoImagen(null);
                                            setPrevisualizacion('');
                                            setProductoActual({...productoActual, imagen_url: ''});
                                        }}
                                        className="cursor-pointer rounded px-2 py-1 text-xs font-medium text-primary hover:bg-red-500/10"
                                    >
                                        Quitar
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center gap-3 pt-2 sm:col-span-3">
                                <button
                                    type="submit"
                                    disabled={subiendoImagen}
                                    className="cursor-pointer flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow transition hover:opacity-90 disabled:opacity-50"
                                >
                                    {subiendoImagen && <div
                                        className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"/>}
                                    {subiendoImagen ? 'Procesando datos...' : modoEdicion ? 'Actualizar Producto' : 'Guardar Producto'}
                                </button>
                                {modoEdicion && (
                                    <button
                                        type="button"
                                        onClick={resetFormulario}
                                        className="cursor-pointer rounded-lg border px-4 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-muted"
                                    >
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative flex-1 max-w-sm">
                            <svg
                                className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Buscar por nombre..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase text-muted-foreground">Filtrar:</span>
                            <select
                                value={filtroCategoria}
                                onChange={(e) => setFiltroCategoria(e.target.value)}
                                className="rounded-lg border bg-background px-3 py-1.5 text-xs font-medium outline-none focus:border-primary"
                            >
                                <option value="todas">Todas las Categorías</option>
                                <option value="ambos">Ambos</option>
                                <option value="auto">Autos</option>
                                <option value="moto">Motos</option>
                            </select>
                            <span className="ml-2 rounded-md bg-muted px-2 py-1 text-xs font-bold text-muted-foreground">
                        {productosFiltrados.length}
                    </span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                                Productos
                            </h3>
                            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
                        {productosFiltrados.length} de {productos.length} productos
                    </span>
                        </div>

                        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead
                                        className="border-b bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                    <tr>
                                        <th className="py-3.5 pl-4 pr-2">Nombre</th>
                                        <th className="px-3 py-3.5">Categoría</th>
                                        <th className="px-3 py-3.5">Precio</th>
                                        <th className="px-3 py-3.5">Stock</th>
                                        <th className="py-3.5 pl-3 pr-4 text-right">Acciones</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                    {productosFiltrados.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                                                No se encontraron productos que coincidan con la búsqueda.
                                            </td>
                                        </tr>
                                    ) : (
                                        productosFiltrados.map((p) => {
                                            const urlFoto = obtenerUrlPublica(p.imagen_url);
                                            return (
                                                <tr key={p.id} className="transition-colors hover:bg-muted/30">
                                                    <td className="py-3 pl-4 pr-2">
                                                        <div className="flex items-center gap-3">
                                                            {urlFoto ? (
                                                                <img
                                                                    src={urlFoto}
                                                                    alt={p.nombre}
                                                                    className="h-11 w-11 shrink-0 rounded-lg border object-cover shadow-sm"
                                                                />
                                                            ) : (
                                                                <div
                                                                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-dashed bg-muted text-[10px] uppercase text-muted-foreground">
                                                                    Sin foto
                                                                </div>
                                                            )}
                                                            <div className="min-w-0 max-w-xs sm:max-w-sm">
                                                                <p className="truncate text-lg font-bold text-foreground">{p.nombre}</p>
                                                                <p className="truncate text-sm text-muted-foreground">
                                                                    {p.descripcion || 'Sin descripción'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-3 py-3">
                                                    <span
                                                        className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                        {p.categoria}
                                                    </span>
                                                    </td>

                                                    <td className="px-3 py-3 font-bold text-foreground">
                                                        $ {Number(p.precio).toLocaleString('es-CL')}
                                                    </td>

                                                    <td className="px-3 py-3">
                                                    <span
                                                        className={`font-semibold ${Number(p.stock) > 0 ? 'text-foreground' : 'text-primary font-bold'}`}>
                                                        {Number(p.stock) > 0 ? `${p.stock} un.` : 'Agotado'}
                                                    </span>
                                                    </td>

                                                    <td className="py-3 pl-3 pr-4 text-right">
                                                        <div className="inline-flex items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={() => handleEditar(p)}
                                                                className="cursor-pointer rounded-lg border border-border bg-background px-4 py-1 text-xs font-bold uppercase tracking-wider text-foreground transition hover:bg-muted"
                                                            >
                                                                Editar
                                                            </button>
                                                            <button
                                                                onClick={() => handleEliminar(p.id, p.imagen_url)}
                                                                className="cursor-pointer rounded-lg border border-secondary bg-primary px-4 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground transition hover:bg-red-400"
                                                            >
                                                                Eliminar
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div className="rounded-2xl border bg-card p-6 shadow-sm">
                        <div className="mb-6 flex items-center justify-between border-b pb-4">
                            <div className="flex items-center gap-2">
                                <h2 className="text-md font-extrabold uppercase tracking-wide text-foreground">
                                    {modoEdicionServicio ? `Editar: ${servicioActual.nombre || 'Servicio'}` : 'Agregar Servicio'}
                                </h2>
                            </div>
                            {modoEdicionServicio && (
                                <button
                                    type="button"
                                    onClick={resetFormularioServicio}
                                    className="cursor-pointer text-sm font-semibold text-muted-foreground underline underline-offset-4 hover:text-foreground"
                                >
                                    Cancelar Edición
                                </button>
                            )}
                        </div>

                        <form onSubmit={handleSubmitServicio} className="grid gap-5 sm:grid-cols-3">
                            <div className="sm:col-span-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nombre del Servicio</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: Cambio de aceite y filtro"
                                    className="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    value={servicioActual.nombre}
                                    onChange={(e) => setServicioActual({...servicioActual, nombre: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Precio Base ($CLP)</label>
                                <div className="relative mt-1.5">
                            <span
                                className="pointer-events-none absolute left-3 top-2 text-sm font-bold text-muted-foreground">$</span>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        placeholder="19990"
                                        className="w-full rounded-lg border bg-background py-2 pl-7 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                        value={servicioActual.precio_minimo}
                                        onChange={(e) => setServicioActual({...servicioActual, precio_minimo: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="sm:col-span-3">
                                <label
                                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descripción</label>
                                <textarea
                                    className="mt-1.5 w-full rounded-lg border bg-background p-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    rows={4}
                                    placeholder="En qué consiste el servicio, qué incluye..."
                                    value={servicioActual.descripcion || ''}
                                    onChange={(e) => setServicioActual({...servicioActual, descripcion: e.target.value})}
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-2 sm:col-span-3">
                                <button
                                    type="submit"
                                    disabled={guardandoServicio}
                                    className="cursor-pointer flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow transition hover:opacity-90 disabled:opacity-50"
                                >
                                    {guardandoServicio && <div
                                        className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"/>}
                                    {guardandoServicio ? 'Guardando...' : modoEdicionServicio ? 'Actualizar Servicio' : 'Guardar Servicio'}
                                </button>
                                {modoEdicionServicio && (
                                    <button
                                        type="button"
                                        onClick={resetFormularioServicio}
                                        className="cursor-pointer rounded-lg border px-4 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-muted"
                                    >
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    <div className="relative max-w-sm">
                        <svg
                            className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Buscar por nombre..."
                            value={busquedaServicios}
                            onChange={(e) => setBusquedaServicios(e.target.value)}
                            className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                                Servicios
                            </h3>
                            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
                        {serviciosFiltrados.length} de {servicios.length} servicios
                    </span>
                        </div>

                        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead
                                        className="border-b bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                    <tr>
                                        <th className="py-3.5 pl-4 pr-2">Nombre</th>
                                        <th className="px-3 py-3.5">Desde</th>
                                        <th className="py-3.5 pl-3 pr-4 text-right">Acciones</th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                    {serviciosFiltrados.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="py-12 text-center text-sm text-muted-foreground">
                                                No se encontraron servicios que coincidan con la búsqueda.
                                            </td>
                                        </tr>
                                    ) : (
                                        serviciosFiltrados.map((s) => (
                                            <tr key={s.id} className="transition-colors hover:bg-muted/30">
                                                <td className="py-3 pl-4 pr-2">
                                                    <div className="min-w-0 max-w-sm">
                                                        <p className="truncate text-lg font-bold text-foreground">{s.nombre}</p>
                                                        <p className="truncate text-sm text-muted-foreground">
                                                            {s.descripcion || 'Sin descripción'}
                                                        </p>
                                                    </div>
                                                </td>

                                                <td className="px-3 py-3 font-bold text-foreground">
                                                    $ {Number(s.precio_minimo).toLocaleString('es-CL')}
                                                </td>

                                                <td className="py-3 pl-3 pr-4 text-right">
                                                    <div className="inline-flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => handleEditarServicio(s)}
                                                            className="cursor-pointer rounded-lg border border-border bg-background px-4 py-1 text-xs font-bold uppercase tracking-wider text-foreground transition hover:bg-muted"
                                                        >
                                                            Editar
                                                        </button>
                                                        <button
                                                            onClick={() => handleEliminarServicio(s.id)}
                                                            className="cursor-pointer rounded-lg border border-secondary bg-primary px-4 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground transition hover:bg-red-400"
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}