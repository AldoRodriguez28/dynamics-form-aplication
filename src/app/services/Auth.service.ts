import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { AuthResponse } from './response/auth/auth-response';
import { environment } from '../../environments/environment';
import { AuthHeaderService } from './shared/auth-header.service';

interface OtpUrlResponse {
  url?: string;
  redirectUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly baseUrl = environment.API_URI;

  constructor(
    private http: HttpClient,
    private authHeader: AuthHeaderService
  ) {}

  /**
   * Envía el token al backend y obtiene el bearerToken como respuesta.
   * @param token token de acceso a validar
   * @returns Observable<AuthResponse>
   */
  loginByToken(token: string): Observable<AuthResponse> {
    const url = `${this.baseUrl}/Auth/login-by-token`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    const body = { token };
    return this.http.post<AuthResponse>(url, body, { headers });
  }

  getOtpUrl(phone: string, businessId: string | number): Observable<string | null> {
    const url = `${this.baseUrl}/Auth/url-otp`;
    const redirectUri = `${window.location.origin}/otp/callback`;
    const params = new HttpParams()
      .set('phone', phone)
      .set('businessid', String(businessId))
      .set('redirectUri', redirectUri);
    return this.http
      .get(url, {
        headers: this.authHeader.build(),
        params,
        responseType: 'text'
      })
      .pipe(
        map((responseText) => {
          const trimmed = (responseText ?? '').trim();
          if (!trimmed) return null;
          try {
            const parsed = JSON.parse(trimmed) as OtpUrlResponse | string;
            if (typeof parsed === 'string') return parsed;
            return parsed?.url ?? parsed?.redirectUrl ?? null;
          } catch {
            return trimmed;
          }
        })
      );
  }

  redeemOtpCode(code: string, state: string | null): Observable<unknown> {
    const url = `${this.baseUrl}/Auth/callBack`;
    const params = new HttpParams().set('code', code);
    const paramsWithState = state ? params.set('state', state) : params;
    const basicToken = btoa(`${environment.USER_PINBOX}:${environment.PASSWORD_PINBOX}`);
    const headers = new HttpHeaders({
      Authorization: `Basic ${basicToken}`
    });

    return this.http.get(url, {
      headers,
      params: paramsWithState,
      responseType: 'text'
    }).pipe(
      map((responseText) => {
        const trimmed = (responseText ?? '').trim();
        if (!trimmed) return null;
        try {
          return JSON.parse(trimmed);
        } catch {
          return trimmed;
        }
      })
    );
  }
}
