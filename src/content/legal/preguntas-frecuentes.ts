import type { LegalContent } from './types';

export const preguntasFrecuentes: LegalContent = {
  title: 'Preguntas frecuentes',
  description: 'Respuestas rápidas sobre el estado de las prendas, tallas, cambios, entrega y pago en Sale Enzo.',
  updatedAt: '2026-10-12',
  sections: [
    {
      heading: '¿Cómo sé en qué estado está una prenda?',
      paragraphs: [
        'Cada prenda indica su estado en la ficha y las fotos muestran los detalles, también los defectos que conozco.',
        '{{ESCALA_DE_ESTADO}}',
        'Si quieres ver algo de cerca, pídeme más fotos por WhatsApp.',
      ],
    },
    {
      heading: '¿Cómo elijo mi talla?',
      paragraphs: [
        'La talla de la etiqueta es una referencia: cada marca talla distinto.',
        'Lo más seguro es comparar medidas con una prenda tuya que te quede bien. Pídeme las medidas por chat.',
        '{{GUIA_DE_MEDIDAS}}',
      ],
    },
    {
      heading: '¿Puedo cambiar o devolver una prenda?',
      paragraphs: ['{{POLITICA_DE_CAMBIOS}}'],
    },
    {
      heading: '¿Cómo me llega la prenda?',
      paragraphs: [
        'Coordinamos la entrega por WhatsApp cuando confirmamos la compra.',
        'Zonas de entrega: {{ZONAS_DE_ENTREGA}}.',
        'Costo de entrega: {{COSTO_DE_ENTREGA}}.',
      ],
    },
    {
      heading: '¿Cómo pago?',
      paragraphs: ['La web no cobra en línea. El pago se acuerda por chat.', 'Métodos de pago: {{METODOS_DE_PAGO}}.'],
    },
    {
      heading: '¿Añadir al carrito reserva la prenda?',
      paragraphs: ['No. La prenda queda separada para ti solo cuando lo acordamos por WhatsApp.'],
    },
  ],
};
