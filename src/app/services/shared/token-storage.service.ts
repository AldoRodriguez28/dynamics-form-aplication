import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private static readonly STORAGE_KEY = 'KEY';

  /** Guarda el token en localStorage */
  setToken(token: string): void {
    localStorage.setItem(TokenStorageService.STORAGE_KEY, token);
  }

  /** Lee el token de localStorage */
  getToken(): string | null {
    return localStorage.getItem(TokenStorageService.STORAGE_KEY);
  }

  /** Elimina el token (logout) */
  clearToken(): void {
    localStorage.removeItem(TokenStorageService.STORAGE_KEY);
  }
}
