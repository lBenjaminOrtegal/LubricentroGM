/**
 * Redimensiona y comprime una imagen a formato WebP usando Canvas.
 * @param {File} file - Archivo de imagen original.
 * @param {number} maxWidth - Ancho máximo permitido (default: 1200px).
 * @param {number} calidad - Calidad de compresión WebP entre 0.1 y 1.0 (default: 0.75).
 * @returns {Promise<Blob>} Imagen comprimida en Blob WebP.
 */
export async function comprimirYConvertirAWebP(file, maxWidth = 1200, calidad = 0.75) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;

            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Escalar manteniendo proporción si supera el ancho máximo
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Exportar a WebP
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Fallo al comprimir la imagen.'));
                        }
                    },
                    'image/webp',
                    calidad
                );
            };

            img.onerror = (err) => reject(err);
        };

        reader.onerror = (err) => reject(err);
    });
}