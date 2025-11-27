import { Routes } from '@angular/router';
import { BusinessListComponent } from './business-list/business-list.component';
import { BusinessFormComponent } from './business-form/business-form.component';

export const routes: Routes = [
  { path: ':idClient/:businessId', component: BusinessFormComponent },
  { path: ':idClient', component: BusinessListComponent },
  { path: '', pathMatch: 'full', redirectTo: '2009786511' },
  { path: '**', redirectTo: '2009786511' }
];
