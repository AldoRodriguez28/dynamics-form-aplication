import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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

  getOtpUrl(): Observable<string | null> {
    const url = `${this.baseUrl}/Auth/url-otp`;
    return this.http
      .get<OtpUrlResponse | string>(url, { headers: this.authHeader.build() })
      .pipe(
        map((response) => {
          if (typeof response === 'string') return response;
          return response?.url ?? response?.redirectUrl ?? null;
        })
      );
  }
}
