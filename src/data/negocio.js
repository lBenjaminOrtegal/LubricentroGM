export const negocio = {
  nombre: 'Lubricentro G&M',
  eslogan: 'Todo para la mantención de tu auto y tu moto.',
  telefonoWhatsapp: '56954885533',
  direccion: {
    calle: 'Brasilia 2414 Local B',
    comuna: 'Padre Hurtado',
    region: 'Región Metropolitana',
  },
  horario: [
    { dias: 'Lunes a Viernes', horas: '09:00 - 20:00' },
    { dias: 'Miércoles', horas: '16:00 - 20:00' },
    { dias: 'Sábado y Domingo', horas: '10:00 - 16:00' },
  ],
  coordenadas: {
    lat: -33.57229760867668,
    lng: -70.81360731840368
  },
  googleMapsUrl: 'https://maps.app.goo.gl/ojAmHA7XvsaU7MJP9',
  correo: 'lubricentrog.m@gmail.com',
  redes: {
    instagram: 'https://www.instagram.com/lubricentro_g.m',
  },
};

export function linkWhatsapp(mensaje) {
  const base = `https://wa.me/${negocio.telefonoWhatsapp}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}

export function linkMailto({ asunto, cuerpo } = {}) {
  const params = new URLSearchParams();
  if (asunto) params.set('subject', asunto);
  if (cuerpo) params.set('body', cuerpo);
  const query = params.toString();
  return `mailto:${negocio.correo}${query ? `?${query}` : ''}`;
}

export function linkGmailCompose({ asunto, cuerpo } = {}) {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: negocio.correo,
  });
  if (asunto) params.set('su', asunto);
  if (cuerpo) params.set('body', cuerpo);
  return `https://mail.google.com/mail/?${params.toString()}`;
}
