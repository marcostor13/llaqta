import { Routes } from '@angular/router';
import { LandingComponent } from './components/landing';
import { BackofficeComponent } from './components/backoffice';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'admin', component: BackofficeComponent }
];
