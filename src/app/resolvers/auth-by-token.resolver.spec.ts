import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { authByTokenResolver } from './auth-by-token.resolver';
import { AuthService } from '../services/Auth.service';
import { TokenStorageService } from '../services/shared/token-storage.service';
import { ThemeService } from '../theme/theme.service';

/** Construye un JWT de prueba (header.payload.signature) con el payload dado. */
function makeJwt(payload: Record<string, unknown>): string {
  const b64 = (obj: unknown) => btoa(JSON.stringify(obj));
  return `${b64({ alg: 'none' })}.${b64(payload)}.sig`;
}

function routeWithToken(token: string): ActivatedRouteSnapshot {
  return {
    queryParamMap: convertToParamMap({ token }),
    paramMap: convertToParamMap({}),
    url: [],
  } as unknown as ActivatedRouteSnapshot;
}

describe('authByTokenResolver — origin', () => {
  let theme: jasmine.SpyObj<ThemeService>;
  let auth: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    theme = jasmine.createSpyObj<ThemeService>('ThemeService', ['applyFromOrigin']);
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['loginByToken']);
    TestBed.configureTestingModule({
      providers: [
        TokenStorageService,
        { provide: ThemeService, useValue: theme },
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: { navigateByUrl: () => {} } },
      ],
    });
    localStorage.clear();
  });

  it('aplica y persiste el origin cuando el JWT lo trae', (done) => {
    const bearer = makeJwt({ 'bcm.origin': 'brandx' });
    auth.loginByToken.and.returnValue(of({ bearerToken: bearer } as any));
    const storage = TestBed.inject(TokenStorageService);

    TestBed.runInInjectionContext(() => {
      (authByTokenResolver(routeWithToken('t'), {} as any) as any).subscribe(() => {
        expect(theme.applyFromOrigin).toHaveBeenCalledWith('brandx');
        expect(storage.getOrigin()).toBe('brandx');
        done();
      });
    });
  });

  it('aplica default (null) cuando el JWT no trae origin', (done) => {
    const bearer = makeJwt({ 'bcm.advertiser_id': 1 });
    auth.loginByToken.and.returnValue(of({ bearerToken: bearer } as any));

    TestBed.runInInjectionContext(() => {
      (authByTokenResolver(routeWithToken('t'), {} as any) as any).subscribe(() => {
        expect(theme.applyFromOrigin).toHaveBeenCalledWith(null);
        done();
      });
    });
  });
});
