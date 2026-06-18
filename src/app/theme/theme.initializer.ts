import { inject } from '@angular/core';
import { ThemeService } from './theme.service';
import { TokenStorageService } from '../services/shared/token-storage.service';

/** Reaplica el tema desde el origin persistido (recargas / arranque directo). */
export function applyStoredTheme(theme: ThemeService, storage: TokenStorageService): void {
  theme.applyFromOrigin(storage.getOrigin());
}

/** Factory para provideAppInitializer: resuelve dependencias vía inject(). */
export function themeInitializer(): void {
  applyStoredTheme(inject(ThemeService), inject(TokenStorageService));
}
