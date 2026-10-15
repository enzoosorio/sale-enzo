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
        'El estado va de 1 a 10, en pasos de 0,5. 10 es una prenda nueva, de 9 a 9,5 es como nueva, de 7 a 8,5 es usada con señales normales de uso y por debajo de 7 tiene desgaste visible.',
        'Si hay un defecto (agujero, mancha, bolitas en la tela, decoloración, desgaste o hilos jalados) lo indico en la nota de la prenda y se ve en las fotos.',
        'Si quieres ver algo de cerca, pídeme más fotos por WhatsApp.',
      ],
    },
    {
      heading: '¿Cómo elijo mi talla?',
      paragraphs: [
        'La talla de la etiqueta es una referencia: cada marca talla distinto.',
        'Lo más seguro es comparar medidas con una prenda tuya que te quede bien. Pídeme las medidas por chat.',
        'Las tallas van de XS a XXXL. Algunas prendas indican también el corte (slim, regular, oversize o boxy): un oversize o un boxy te queda más holgado que su talla.',
      ],
    },
    {
      heading: '¿Puedo cambiar o devolver una prenda?',
      paragraphs: ['Son prendas de segunda mano, no hay cambios ni devoluciones.'],
    },
    {
      heading: '¿Cómo me llega la prenda?',
      paragraphs: [
        'Coordinamos la entrega por WhatsApp cuando confirmamos la compra.',
        'Zonas de entrega: Todo lima (Entrega por app de transporte).',
        'Costo de entrega: Coste del ride en la app.',
      ],
    },
    {
      heading: '¿Cómo pago?',
      paragraphs: ['La web no cobra en línea. El pago se acuerda por chat.', 'Métodos de pago: Yape, Plin, transferencia bancaria y efectivo.'],
    },
    {
      heading: '¿Añadir al carrito reserva la prenda?',
      paragraphs: ['No. La prenda queda separada para ti solo cuando lo acordamos por WhatsApp.'],
    },
  ],
};
