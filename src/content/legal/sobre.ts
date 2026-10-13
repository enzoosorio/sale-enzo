import type { LegalContent } from './types';

export const sobre: LegalContent = {
  title: 'Sobre Sale Enzo',
  description:
    'Sale Enzo es la venta del clóset personal de Enzo Osorio: ropa de segunda mano con historia, lista para seguir usándose.',
  updatedAt: '2026-10-12',
  intro: 'Productos con historia, listos para una segunda oportunidad.',
  sections: [
    {
      heading: 'Qué es',
      paragraphs: [
        'Sale Enzo es mi clóset puesto en una página web. Soy Enzo Osorio y aquí vendo ropa que ya usé y que merece seguir usándose.',
        'No es una tienda ni una marca. Es una venta personal, prenda por prenda.',
      ],
    },
    {
      heading: 'Por qué segunda mano',
      paragraphs: [
        'Una prenda buena no debería quedarse guardada. Si ya no la uso, prefiero que alguien más la disfrute.',
        'Comprar de segunda mano alarga la vida de la ropa y te deja encontrar piezas que ya no están en tiendas.',
      ],
    },
    {
      heading: 'Cómo lo hago',
      list: [
        'Fotografío cada prenda y cuento su estado con honestidad.',
        'Cada prenda es única: cuando se vende, se va.',
        'Todo se conversa por WhatsApp, de persona a persona.',
      ],
    },
  ],
};
