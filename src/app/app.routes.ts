import { Routes } from '@angular/router';
import { BusinessListComponent } from './business-list/business-list.component';
import { BusinessFormComponent } from './business-form/business-form.component';
import { authByTokenResolver } from './resolvers/auth-by-token.resolver';
import { UnauthorizedComponent } from './unauthorized/unauthorized.component';
import { OtpCallbackComponent } from './otp-callback/otp-callback.component';

export const routes: Routes = [
  { path: 'unauthorized', component: UnauthorizedComponent },
  { path: 'otp/callback', component: OtpCallbackComponent },
  { path: ':idClient/:businessId', component: BusinessFormComponent, resolve: { authReady: authByTokenResolver } },
  { path: ':idClient', component: BusinessListComponent, resolve: { authReady: authByTokenResolver } },
  { path: '', pathMatch: 'full', redirectTo: '2009786511' },
  { path: '**', redirectTo: '2009786511' }
];
