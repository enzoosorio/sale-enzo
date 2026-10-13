import type { LegalContent } from './types';

export const privacidad: LegalContent = {
  title: 'Política de privacidad',
  description:
    'Qué datos usa Sale Enzo, para qué los uso y cómo pedir que los borre. Pocos datos, solo los necesarios para venderte una prenda.',
  updatedAt: '2026-10-12',
  intro: 'Uso los menos datos posibles, y solo para que puedas comprar.',
  sections: [
    {
      heading: 'Qué datos uso',
      list: [
        'Tu cuenta de Google, si inicias sesión: el nombre, el correo y la foto de perfil que Google comparte.',
        'El contenido de tu carrito: las prendas que añades y su precio.',
        'La conversación de WhatsApp: tu número y lo que me escribes para coordinar la compra.',
      ],
    },
    {
      heading: 'Para qué los uso',
      list: [
        'Para guardar tu carrito y mostrártelo cuando vuelvas.',
        'Para confirmar disponibilidad, acordar el pago y coordinar la entrega.',
        'No vendo tus datos ni los uso para publicidad.',
      ],
    },
    {
      heading: 'Tus derechos',
      paragraphs: [
        'En el Perú te protege la Ley N.° 29733, Ley de Protección de Datos Personales. En palabras simples: puedes saber qué datos tengo sobre ti, pedir que los corrija y pedir que los borre.',
        'Para pedirlo, escríbeme por WhatsApp desde el enlace de Contacto. Te respondo por el mismo chat.',
      ],
    },
    {
      heading: 'Dónde se guardan',
      paragraphs: [
        'La web guarda tu cuenta y tu carrito en los servicios en la nube que usa para funcionar. Las conversaciones quedan en WhatsApp.',
        'Conservo los datos mientras los necesite para tus compras, o hasta que me pidas borrarlos.',
      ],
    },
  ],
};
