import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'design',
    pathMatch: 'full',
  },
  {
    path: 'design',
    loadComponent: () =>
      import('./design/design.component').then((m) => m.DesignComponent),
  },
];
