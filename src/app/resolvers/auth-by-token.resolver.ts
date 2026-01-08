import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { catchError, map, of, tap } from 'rxjs';
import { AuthService } from '../services/Auth.service';
import { TokenStorageService } from '../services/shared/token-storage.service';
import { decodeJwtPayload } from '../utils/jwt.utils';

export const authByTokenResolver: ResolveFn<boolean> = (route) => {
    const token = route.queryParamMap.get('token') ?? route.paramMap.get('token') ?? null;
    const idClient = route.paramMap.get('idClient');
    const tokenFromPath = (!token && idClient && isNaN(Number(idClient))) ? idClient : null;

    const finalToken = token ?? tokenFromPath;
    if (!finalToken) return of(true);

    const auth = inject(AuthService);
    const storage = inject(TokenStorageService);

    return auth.loginByToken(finalToken).pipe(
        tap(res => {
            storage.setToken(res.bearerToken);

            const payload = decodeJwtPayload(res.bearerToken);
            const advertiserId = payload?.['bcm.advertiser_id'];
            if (advertiserId != null) storage.setAdvertiserId(String(advertiserId));

            const advertiserName = payload?.['bcm.advertiser_name'];
            if (advertiserName != null) storage.setAdvertiserName(String(advertiserName));
        }),
        map(() => true),
        catchError((err) => {
            return of(false);
        })
    );
};
