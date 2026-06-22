import { Injectable, signal, computed } from '@angular/core';
import { ThemeConfig } from './theme-config';
import { THEME_REGISTRY, DEFAULT_ORIGIN } from './theme.registry';
import { DEFAULT_THEME } from './themes/default.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly active = signal<ThemeConfig>(DEFAULT_THEME);
  readonly layoutKey = computed(() => this.active().layoutKey);
  /** Marca de la sesión leída del token; null = sin marca. La aplica el ThemeRouteBinder. */
  readonly sessionOrigin = signal<string | null>(null);

  applyFromOrigin(origin: string | null): void {
    const key = origin?.trim().toLowerCase() || null;
    const theme = (key && THEME_REGISTRY[key]) || THEME_REGISTRY[DEFAULT_ORIGIN];
    if (key && !THEME_REGISTRY[key]) {
      console.warn(`[ThemeService] origin no registrado: "${origin}". Usando default.`);
    }
    this.active.set(theme);

    const root = document.documentElement;
    root.setAttribute('data-origin', theme.origin);
    Object.entries(theme.cssVars ?? {}).forEach(([prop, value]) => {
      root.style.setProperty(prop, value);
    });
  }
}
