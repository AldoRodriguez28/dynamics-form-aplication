import { TestBed } from '@angular/core/testing';
import { applyStoredTheme } from './theme.initializer';
import { ThemeService } from './theme.service';

describe('applyStoredTheme', () => {
  it('siembra sessionOrigin desde el storage', () => {
    const storage = { getOrigin: () => 'sacom' } as any;
    const theme = TestBed.inject(ThemeService);
    applyStoredTheme(theme, storage);
    expect(theme.sessionOrigin()).toBe('sacom');
  });

  it('siembra null cuando no hay origin guardado', () => {
    const storage = { getOrigin: () => null } as any;
    const theme = TestBed.inject(ThemeService);
    applyStoredTheme(theme, storage);
    expect(theme.sessionOrigin()).toBeNull();
  });
});
