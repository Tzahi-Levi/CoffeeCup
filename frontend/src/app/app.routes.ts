import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/library-page/library-page.component').then(
        (m) => m.LibraryPageComponent
      ),
    data: { animation: 'LibraryPage' }
  },
  {
    path: 'add',
    loadComponent: () =>
      import('./components/coffee-form-page/coffee-form-page.component').then(
        (m) => m.CoffeeFormPageComponent
      ),
    data: { animation: 'FormPage' }
  },
  {
    path: 'edit/:id',
    loadComponent: () =>
      import('./components/coffee-form-page/coffee-form-page.component').then(
        (m) => m.CoffeeFormPageComponent
      ),
    data: { animation: 'FormPage' }
  },
  {
    path: '**',
    redirectTo: ''
  }
];
