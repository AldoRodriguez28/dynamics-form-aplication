import { Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthHeaderService {
  constructor(private tokenStore: TokenStorageService) {}

  build(): HttpHeaders {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const token = this.tokenStore.getToken();

    if (token && token.trim().length > 0) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }
}
