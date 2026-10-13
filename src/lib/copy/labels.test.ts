import { describe, expect, it } from 'vitest';
import { genderLabel, sizeLabel, slugLabel, stockLabel } from './labels';

describe('copy labels', () => {
  it('labels sizes in Spanish', () => {
    expect(sizeLabel('M')).toBe('Talla M');
    expect(sizeLabel('ONE SIZE')).toBe('Talla única');
    expect(sizeLabel(null)).toBeNull();
  });

  it('translates gender values and keeps unknown ones', () => {
    expect(genderLabel('male')).toBe('Hombre');
    expect(genderLabel('female')).toBe('Mujer');
    expect(genderLabel('kids')).toBe('kids');
  });

  it('reads one-off stock as a single piece', () => {
    expect(stockLabel(1)).toBe('Pieza única');
    expect(stockLabel(14)).toBe('14 disponibles');
    expect(stockLabel(0)).toBe('Ya no está disponible');
  });

  it('turns slugs into readable names', () => {
    expect(slugLabel('ropa-superior')).toBe('Ropa superior');
  });
});
