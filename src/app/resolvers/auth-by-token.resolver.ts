import { ResolveFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { catchError, map, of, tap } from 'rxjs';
import { AuthService } from '../services/Auth.service';
import { TokenStorageService } from '../services/shared/token-storage.service';
import { ThemeService } from '../theme/theme.service';
import { decodeJwtPayload } from '../utils/jwt.utils';

export const authByTokenResolver: ResolveFn<boolean> = (route) => {
    const token = route.queryParamMap.get('token') ?? route.paramMap.get('token') ?? null;
    const idClient = route.paramMap.get('idClient');
    const tokenFromPath = (!token && idClient && isNaN(Number(idClient))) ? idClient : null;

    const finalToken = token ?? tokenFromPath;
    console.info('[Resolver] auth-by-token start', { url: route?.url?.map(s => s.path).join('/'), token: finalToken });
    if (!finalToken) return of(true);

    const auth = inject(AuthService);
    const storage = inject(TokenStorageService);
    const router = inject(Router);
    const theme = inject(ThemeService);

    storage.setAccessToken(finalToken);
    console.info('[Resolver] calling AuthService.loginByToken');
    return auth.loginByToken(finalToken).pipe(
        tap(res => {
            storage.setToken(res.bearerToken);

            const payload = decodeJwtPayload(res.bearerToken);
            const advertiserId = payload?.['bcm.advertiser_id'];
            if (advertiserId != null) storage.setAdvertiserId(String(advertiserId));

            const advertiserName = payload?.['bcm.advertiser_name'];
            if (advertiserName != null) storage.setAdvertiserName(String(advertiserName));

            const roleClaim = payload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
            const role = Array.isArray(roleClaim) ? roleClaim[0] : roleClaim;
            if (role != null) storage.setRole(String(role));

            const origin = payload?.['bcm.origin'] ?? payload?.['origin'] ?? null;
            if (origin != null) storage.setOrigin(String(origin));
            theme.applyFromOrigin(origin != null ? String(origin) : null);

        }),
        map(() => true),
        catchError((err) => {
            console.error('[Resolver] auth-by-token error', err);
            if (err?.status === 401) {
                storage.clearToken();
                router.navigateByUrl('/unauthorized');
            }
            return of(false);
        })
    );
};
