import { describe, expect, it } from 'vitest';
import { LEGAL_PAGES } from './index';

const allText = (page: (typeof LEGAL_PAGES)[number]) => {
  const { title, description, intro, sections } = page.content;
  return [title, description, intro ?? '', ...sections.flatMap(s => [s.heading, ...(s.paragraphs ?? []), ...(s.list ?? [])])].join('\n');
};

describe('LEGAL_PAGES', () => {
  it('lists five unique paths with titles, descriptions and ISO dates', () => {
    expect(LEGAL_PAGES).toHaveLength(5);
    expect(new Set(LEGAL_PAGES.map(p => p.path)).size).toBe(5);
    for (const { content } of LEGAL_PAGES) {
      expect(content.title).not.toMatch(/Sale Enzo\s*\|/);
      expect(content.description.length).toBeGreaterThan(40);
      expect(content.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(content.sections.length).toBeGreaterThan(0);
      for (const s of content.sections) expect((s.paragraphs?.length ?? 0) + (s.list?.length ?? 0)).toBeGreaterThan(0);
    }
  });

  it('keeps the voice of a personal sale, without formal-store promises', () => {
    for (const page of LEGAL_PAGES) {
      const text = allText(page);
      expect(text).not.toMatch(/garant[íi]a|env[íi]o gratis|\bRUC\b|Libro de Reclamaciones|S\.A\.C\.|E\.I\.R\.L\./i);
    }
  });

  it('uses only well-formed {{UPPER_SNAKE}} placeholders', () => {
    for (const page of LEGAL_PAGES) {
      const text = allText(page);
      const braces = text.match(/\{\{[^}]*\}\}/g) ?? [];
      for (const p of braces) expect(p).toMatch(/^\{\{[A-Z_]+\}\}$/);
    }
  });
});
