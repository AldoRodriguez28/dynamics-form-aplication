import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private static readonly STORAGE_KEY = 'KEY';
  private static readonly ADVERTISER_KEY = 'ADVERTISER_KEY';
  private static readonly ADVERTISER_NAME = 'ADVERTISER_NAME';
  private static readonly ROLE_KEY = 'ROLE_KEY';
  private static readonly ACCESS_TOKEN_KEY = 'ACCESS_TOKEN_KEY';
  private static readonly OTP_VERIFIED_KEY = 'OTP_VERIFIED';
  private static readonly OTP_TARGET_KEY = 'OTP_TARGET';
  private static readonly OTP_VERIFIED_NUMBERS_KEY = 'number_otp_verified';

  setOtpVerified(verified: boolean): void {
    sessionStorage.setItem(TokenStorageService.OTP_VERIFIED_KEY, verified ? 'true' : 'false');
  }

  isOtpVerified(): boolean {
    return sessionStorage.getItem(TokenStorageService.OTP_VERIFIED_KEY) === 'true';
  }

  clearOtpVerified(): void {
    sessionStorage.removeItem(TokenStorageService.OTP_VERIFIED_KEY);
  }

  setOtpTarget(target: OtpRedirectTarget): void {
    sessionStorage.setItem(TokenStorageService.OTP_TARGET_KEY, JSON.stringify(target));
  }

  getOtpTarget(): OtpRedirectTarget | null {
    const raw = sessionStorage.getItem(TokenStorageService.OTP_TARGET_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as OtpRedirectTarget;
    } catch {
      return null;
    }
  }

  clearOtpTarget(): void {
    sessionStorage.removeItem(TokenStorageService.OTP_TARGET_KEY);
  }

  getVerifiedOtpNumbers(): string[] {
    const raw = sessionStorage.getItem(TokenStorageService.OTP_VERIFIED_NUMBERS_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((value) => typeof value === 'string');
    } catch {
      return [];
    }
  }

  isOtpNumberVerified(phone: string): boolean {
    return this.getVerifiedOtpNumbers().includes(phone);
  }

  addVerifiedOtpNumber(phone: string): void {
    const numbers = this.getVerifiedOtpNumbers();
    if (numbers.includes(phone)) return;
    numbers.push(phone);
    sessionStorage.setItem(
      TokenStorageService.OTP_VERIFIED_NUMBERS_KEY,
      JSON.stringify(numbers)
    );
  }

  clearOtpVerifiedNumbers(): void {
    sessionStorage.removeItem(TokenStorageService.OTP_VERIFIED_NUMBERS_KEY);
  }

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
    sessionStorage.removeItem(TokenStorageService.ROLE_KEY);
    sessionStorage.removeItem(TokenStorageService.ACCESS_TOKEN_KEY);
    this.clearOtpVerified();
    this.clearOtpTarget();
    this.clearOtpVerifiedNumbers();
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
    sessionStorage.setItem(TokenStorageService.ROLE_KEY, role);
  }

  /** Lee role */
  getRole(): string | null {
    return sessionStorage.getItem(TokenStorageService.ROLE_KEY) ?? localStorage.getItem(TokenStorageService.ROLE_KEY);
  }

  /** Guarda el token de acceso recibido en la URL (session) */
  setAccessToken(token: string): void {
    sessionStorage.setItem(TokenStorageService.ACCESS_TOKEN_KEY, token);
  }

  /** Lee el token de acceso recibido en la URL (session) */
  getAccessToken(): string | null {
    return sessionStorage.getItem(TokenStorageService.ACCESS_TOKEN_KEY);
  }
}

export interface OtpRedirectTarget {
  clientId: string;
  businessId: string | number;
  advertiserName?: string;
  commercialName?: string;
  phone?: string;
}
