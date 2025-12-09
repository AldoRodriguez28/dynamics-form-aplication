import { Routes } from '@angular/router';
import { BusinessListComponent } from './business-list/business-list.component';
import { BusinessFormComponent } from './business-form/business-form.component';
import { authByTokenResolver } from './resolvers/auth-by-token.resolver';

export const routes: Routes = [
  { path: ':idClient/:businessId', component: BusinessFormComponent, resolve: { authReady: authByTokenResolver } },
  { path: ':idClient', component: BusinessListComponent, resolve: { authReady: authByTokenResolver } },
  { path: '', pathMatch: 'full', redirectTo: '2009786511' },
  { path: '**', redirectTo: '2009786511' }
];
