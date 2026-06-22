import { SACOM_THEME } from './sacom.theme';
import { THEME_REGISTRY } from '../theme.registry';
import { LAYOUT_REGISTRY } from '../../layouts/layout.registry';

describe('SACOM_THEME', () => {
  it('tiene origin y layoutKey "sacom"', () => {
    expect(SACOM_THEME.origin).toBe('sacom');
    expect(SACOM_THEME.layoutKey).toBe('sacom');
  });

  it('define el token primario amarillo y la fuente Inter', () => {
    expect(SACOM_THEME.cssVars['--color-primary']).toBe('#FFD800');
    expect(SACOM_THEME.cssVars['--font-family']).toContain('Inter');
  });

  it('está registrado en THEME_REGISTRY y LAYOUT_REGISTRY bajo "sacom"', () => {
    expect(THEME_REGISTRY['sacom']).toBe(SACOM_THEME);
    expect(LAYOUT_REGISTRY['sacom']).toBeTruthy();
  });
});
