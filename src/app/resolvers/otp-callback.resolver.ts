import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/Auth.service';

export interface OtpRedeemResult {
  ok: boolean;
  message: string;
  raw?: unknown;
}

const messageFromResponse = (response: unknown): string => {
  if (response == null) return 'Respuesta vacía.';
  if (typeof response === 'string') return response;
  if (typeof response === 'object') {
    const payload = response as Record<string, unknown>;
    const message =
      payload['message'] ??
      payload['status'] ??
      payload['code'] ??
      payload['detail'];
    if (message != null) return String(message);
    try {
      return JSON.stringify(response);
    } catch {
      return 'Respuesta no legible.';
    }
  }
  return String(response);
};

export const otpCallbackResolver: ResolveFn<OtpRedeemResult> = (route) => {
  const code = route.queryParamMap.get('code');
  const state = route.queryParamMap.get('state');
  if (!code) {
    return of({ ok: true, message: 'Sin código OTP.' });
  }

  const auth = inject(AuthService);

  return auth.redeemOtpCode(code, state).pipe(
    map((res) => ({
      ok: true,
      message: messageFromResponse(res),
      raw: res
    })),
    catchError((err) => {
      const message =
        err?.error?.message ??
        err?.error?.detail ??
        err?.message ??
        'Error al redimir el código OTP.';
      return of({ ok: false, message: String(message), raw: err });
    })
  );
};
