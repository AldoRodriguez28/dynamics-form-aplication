import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthResponse } from './response/auth/auth-response';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly baseUrl = environment.API_URI;

  constructor(private http: HttpClient) {}

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
}
