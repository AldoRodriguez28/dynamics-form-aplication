import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';
import { DEFAULT_THEME } from './themes/default.theme';
import { BRANDX_THEME } from './themes/brandx.theme';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-origin');
    document.documentElement.style.removeProperty('--color-primary');
    document.documentElement.style.removeProperty('--color-accent');
  });

  it('arranca con el tema default', () => {
    expect(service.active()).toBe(DEFAULT_THEME);
    expect(service.layoutKey()).toBe('default');
  });

  it('aplica un tema conocido y setea data-origin + cssVars', () => {
    service.applyFromOrigin('brandx');
    expect(service.active()).toBe(BRANDX_THEME);
    expect(service.layoutKey()).toBe('brandx');
    expect(document.documentElement.getAttribute('data-origin')).toBe('brandx');
    expect(document.documentElement.style.getPropertyValue('--color-primary').trim())
      .toBe('#d6206e');
  });

  it('cae a default cuando origin es null', () => {
    service.applyFromOrigin(null);
    expect(service.active()).toBe(DEFAULT_THEME);
    expect(document.documentElement.getAttribute('data-origin')).toBe('default');
  });

  it('cae a default cuando origin es desconocido', () => {
    service.applyFromOrigin('no-existe');
    expect(service.active()).toBe(DEFAULT_THEME);
  });

  it('normaliza el origin (trim + minúsculas)', () => {
    service.applyFromOrigin('  BrandX  ');
    expect(service.active()).toBe(BRANDX_THEME);
  });
});
