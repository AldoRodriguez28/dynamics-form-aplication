import { THEME_REGISTRY, DEFAULT_ORIGIN } from './theme.registry';
import { LAYOUT_REGISTRY } from '../layouts/layout.registry';

describe('THEME_REGISTRY (integridad)', () => {
  it('contiene el origin default', () => {
    expect(THEME_REGISTRY[DEFAULT_ORIGIN]).toBeDefined();
  });

  it('cada tema apunta a un layoutKey existente en LAYOUT_REGISTRY', () => {
    Object.values(THEME_REGISTRY).forEach((theme) => {
      expect(LAYOUT_REGISTRY[theme.layoutKey])
        .withContext(`layoutKey "${theme.layoutKey}" del origin "${theme.origin}"`)
        .toBeDefined();
    });
  });

  it('la clave del mapa coincide con el campo origin del tema', () => {
    Object.entries(THEME_REGISTRY).forEach(([key, theme]) => {
      expect(theme.origin).toBe(key);
    });
  });

  it('LAYOUT_REGISTRY contiene la entrada default', () => {
    expect(LAYOUT_REGISTRY['default']).toBeDefined();
  });
});
