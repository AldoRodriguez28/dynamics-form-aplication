import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private static readonly STORAGE_KEY = 'KEY';
  private static readonly ADVERTISER_KEY = 'ADVERTISER_KEY';
  private static readonly ADVERTISER_NAME = 'ADVERTISER_NAME';
  private static readonly ROLE_KEY = 'ROLE_KEY';

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
    localStorage.removeItem(TokenStorageService.ADVERTISER_KEY);
    localStorage.removeItem(TokenStorageService.ADVERTISER_NAME);
    localStorage.removeItem(TokenStorageService.ROLE_KEY);
  }

  /** Guarda advertiser_id */
  setAdvertiserId(advertiserId: string): void {
    localStorage.setItem(TokenStorageService.ADVERTISER_KEY, advertiserId);
  }

  /** Lee advertiser_id */
  getAdvertiserId(): string | null {
    return localStorage.getItem(TokenStorageService.ADVERTISER_KEY);
  }

   /** Guarda advertiser_name */
  setAdvertiserName(advertiserName: string): void {
    localStorage.setItem(TokenStorageService.ADVERTISER_NAME, advertiserName);
  }

  /** Lee advertiser_NAME */
  getAdvertiserName(): string | null {
    return localStorage.getItem(TokenStorageService.ADVERTISER_NAME);
  }

  /** Guarda role */
  setRole(role: string): void {
    localStorage.setItem(TokenStorageService.ROLE_KEY, role);
  }

  /** Lee role */
  getRole(): string | null {
    return localStorage.getItem(TokenStorageService.ROLE_KEY);
  }
}
