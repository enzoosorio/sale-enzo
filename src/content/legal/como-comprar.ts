import type { LegalContent } from './types';

export const comoComprar: LegalContent = {
  title: 'Cómo comprar',
  description:
    'Así funciona una compra en Sale Enzo: eliges prendas, me escribes por WhatsApp y coordinamos pago y entrega por chat.',
  updatedAt: '2026-10-12',
  intro:
    'Sale Enzo no tiene pago en línea. La web te ayuda a elegir; la compra se cierra conversando por WhatsApp.',
  sections: [
    {
      heading: '1. Elige tus prendas',
      paragraphs: [
        'Mira las fotos, la talla y el estado de cada prenda. Si algo te gusta, añádelo al carrito.',
        'Añadir una prenda al carrito no la reserva. Otra persona puede pedirla antes que tú.',
      ],
    },
    {
      heading: '2. Pide por WhatsApp',
      paragraphs: [
        'Desde el carrito, toca “Pedir por WhatsApp”. Se abre un chat conmigo con la lista de prendas ya escrita.',
        'Envía el mensaje tal cual o agrega lo que quieras preguntar: medidas, más fotos o detalles del estado.',
      ],
    },
    {
      heading: '3. Confirmo la disponibilidad',
      paragraphs: [
        'Reviso que las prendas sigan disponibles y te confirmo el precio final por chat.',
        'La prenda queda separada para ti solo cuando lo acordamos en la conversación.',
      ],
    },
    {
      heading: '4. Coordinamos pago y entrega',
      paragraphs: [
        'Acordamos por chat cómo pagas y cómo te llega la prenda.',
        'Métodos de pago: Yape, Plin, transferencia bancaria y efectivo.',
        'Zonas de entrega: Todo lima (Entrega por app de transporte).',
      ],
    },
    {
      heading: '¿Tienes dudas?',
      paragraphs: ['Revisa las preguntas frecuentes o escríbeme por WhatsApp. Respondo en cuanto puedo.'],
    },
  ],
};
