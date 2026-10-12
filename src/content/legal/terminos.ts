import type { LegalContent } from './types';

export const terminos: LegalContent = {
  title: 'Términos y condiciones',
  description:
    'Las reglas de Sale Enzo: una venta informal de ropa de segunda mano entre personas, acordada por WhatsApp.',
  updatedAt: '2026-10-12',
  intro: 'Estas reglas explican cómo funciona Sale Enzo. Al usar la web y escribirme para comprar, las aceptas.',
  sections: [
    {
      heading: 'Qué es Sale Enzo',
      paragraphs: [
        'Sale Enzo es la venta de mi clóset personal: ropa de segunda mano que vendo yo, Enzo Osorio, como persona natural.',
        'No es una tienda ni una empresa. Es una venta informal entre personas, presentada en una página web.',
      ],
    },
    {
      heading: 'Las prendas',
      list: [
        'Todas las prendas son de segunda mano y se venden tal como se describen y se ven en las fotos.',
        'Indico el estado de cada prenda con honestidad, incluidos los detalles o defectos que conozco.',
        'Los colores pueden verse un poco distintos según tu pantalla. Si tienes dudas, pídeme más fotos.',
        'Cada prenda es única: cuando se vende, no hay reposición.',
      ],
    },
    {
      heading: 'Precios y disponibilidad',
      list: [
        'Los precios están en soles (S/) y pueden cambiar mientras la prenda siga publicada.',
        'El precio y la disponibilidad se confirman siempre por chat antes de cerrar la compra.',
        'Añadir una prenda al carrito no la reserva.',
        'Una prenda queda separada para ti solo cuando lo acordamos por WhatsApp.',
      ],
    },
    {
      heading: 'Cómo se cierra una compra',
      paragraphs: [
        'La web no cobra pagos. La compra se cierra por WhatsApp, donde acordamos el pago y la entrega.',
        'Métodos de pago: {{METODOS_DE_PAGO}}. Zonas de entrega: {{ZONAS_DE_ENTREGA}}.',
      ],
    },
    {
      heading: 'Cambios y devoluciones',
      paragraphs: ['{{POLITICA_DE_CAMBIOS}}'],
    },
    {
      heading: 'Cambios en estas reglas',
      paragraphs: [
        'Puedo actualizar estas reglas. La fecha de arriba indica la última versión.',
        'Si una compra ya está acordada por chat, se respeta lo que acordamos.',
      ],
    },
  ],
};
