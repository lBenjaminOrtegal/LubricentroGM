const valorConfigurado = Number(import.meta.env.PRODUCTOS_POR_PAGINA);

export const PRODUCTOS_POR_PAGINA =
    Number.isFinite(valorConfigurado) && valorConfigurado > 0 ? valorConfigurado : 12;