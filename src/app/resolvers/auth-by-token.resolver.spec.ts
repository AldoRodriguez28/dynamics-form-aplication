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

describe('authByTokenResolver — originSystem', () => {
  let auth: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['loginByToken']);
    TestBed.configureTestingModule({
      providers: [
        TokenStorageService,
        ThemeService,
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: { navigateByUrl: () => {} } },
      ],
    });
    localStorage.clear();
  });

  it('setea sessionOrigin y persiste el originSystem cuando el JWT lo trae', (done) => {
    const bearer = makeJwt({ originSystem: 'SACOM' });
    auth.loginByToken.and.returnValue(of({ bearerToken: bearer } as any));
    const storage = TestBed.inject(TokenStorageService);
    const theme = TestBed.inject(ThemeService);

    TestBed.runInInjectionContext(() => {
      (authByTokenResolver(routeWithToken('t'), {} as any) as any).subscribe(() => {
        expect(theme.sessionOrigin()).toBe('SACOM');
        expect(storage.getOrigin()).toBe('SACOM');
        done();
      });
    });
  });

  it('lee también el claim con prefijo bcm.originSystem', (done) => {
    const bearer = makeJwt({ 'bcm.originSystem': 'sacom' });
    auth.loginByToken.and.returnValue(of({ bearerToken: bearer } as any));
    const theme = TestBed.inject(ThemeService);

    TestBed.runInInjectionContext(() => {
      (authByTokenResolver(routeWithToken('t'), {} as any) as any).subscribe(() => {
        expect(theme.sessionOrigin()).toBe('sacom');
        done();
      });
    });
  });

  it('setea sessionOrigin null cuando el JWT no trae originSystem', (done) => {
    const bearer = makeJwt({ 'bcm.advertiser_id': 1, origin: 'BCM' });
    auth.loginByToken.and.returnValue(of({ bearerToken: bearer } as any));
    const theme = TestBed.inject(ThemeService);

    TestBed.runInInjectionContext(() => {
      (authByTokenResolver(routeWithToken('t'), {} as any) as any).subscribe(() => {
        expect(theme.sessionOrigin()).toBeNull();
        done();
      });
    });
  });
});
