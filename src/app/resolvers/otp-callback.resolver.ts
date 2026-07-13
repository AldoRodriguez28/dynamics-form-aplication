import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/Auth.service';

export interface OtpRedeemResult {
  ok: boolean;
  message: string;
  raw?: unknown;
  clientId?: string;
  businessId?: string;
  isVerified?: boolean;
  status?: number;
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

const parseOtpPayload = (response: unknown) => {
  if (!response || typeof response !== 'object') {
    return {};
  }

  const payload = response as Record<string, unknown>;
  const clientId = payload['clientId'];
  const businessId = payload['bussines'] ?? payload['business'] ?? payload['businessId'];
  const isVerified = payload['isVerified'];
  const status = payload['status'];

  return {
    clientId: clientId != null ? String(clientId) : undefined,
    businessId: businessId != null ? String(businessId) : undefined,
    isVerified: typeof isVerified === 'boolean' ? isVerified : undefined,
    status:
      typeof status === 'number'
        ? status
        : typeof status === 'string' && status.trim()
          ? Number(status)
          : undefined
  };
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
      raw: res,
      ...parseOtpPayload(res)
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
