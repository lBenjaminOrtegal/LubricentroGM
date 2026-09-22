const modulos = import.meta.glob('/src/assets/productos/*.{jpg,jpeg,png,webp}', {
  eager: true,
});

export function resolverImagenProducto(archivo) {
  const entry = Object.entries(modulos).find(([ruta]) => ruta.endsWith(`/${archivo}`));
  return entry ? entry[1].default : null;
}