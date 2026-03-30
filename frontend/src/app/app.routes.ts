import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/auth-page/auth-page.component').then(
        (m) => m.AuthPageComponent
      ),
  },
  {
    path: '',
    loadComponent: () =>
      import('./components/library-page/library-page.component').then(
        (m) => m.LibraryPageComponent
      ),
    canActivate: [authGuard],
    data: { animation: 'LibraryPage' }
  },
  {
    path: 'add',
    loadComponent: () =>
      import('./components/coffee-form-page/coffee-form-page.component').then(
        (m) => m.CoffeeFormPageComponent
      ),
    canActivate: [authGuard],
    data: { animation: 'FormPage' }
  },
  {
    path: 'edit/:id',
    loadComponent: () =>
      import('./components/coffee-form-page/coffee-form-page.component').then(
        (m) => m.CoffeeFormPageComponent
      ),
    canActivate: [authGuard],
    data: { animation: 'FormPage' }
  },
  {
    path: 'recipes/:id',
    loadComponent: () =>
      import('./pages/recipe-detail-page/recipe-detail-page.component').then(
        (m) => m.RecipeDetailPageComponent
      ),
    canActivate: [authGuard],
    data: { animation: 'RecipeDetailPage' }
  },
  {
    path: 'maintenance',
    loadComponent: () =>
      import('./pages/maintenance-page/maintenance-page.component').then(
        (m) => m.MaintenancePageComponent
      ),
    canActivate: [authGuard],
    data: { animation: 'MaintenancePage' }
  },
  {
    path: '**',
    redirectTo: ''
  }
];
