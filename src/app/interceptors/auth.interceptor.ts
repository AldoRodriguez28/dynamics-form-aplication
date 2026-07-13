import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenStorageService } from '../services/shared/token-storage.service';

export const authInterceptorFn: HttpInterceptorFn = (req, next) => {
  const token = inject(TokenStorageService).getToken();
  return next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req);
};
