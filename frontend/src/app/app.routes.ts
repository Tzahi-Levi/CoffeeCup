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
    path: 'beans',
    loadComponent: () =>
      import('./components/bean-journal-page/bean-journal-page.component').then(
        (m) => m.BeanJournalPageComponent
      ),
    data: { animation: 'BeansPage' }
  },
  {
    path: 'beans/add',
    loadComponent: () =>
      import('./components/bean-form-page/bean-form-page.component').then(
        (m) => m.BeanFormPageComponent
      ),
    data: { animation: 'FormPage' }
  },
  {
    path: 'beans/edit/:id',
    loadComponent: () =>
      import('./components/bean-form-page/bean-form-page.component').then(
        (m) => m.BeanFormPageComponent
      ),
    data: { animation: 'FormPage' }
  },
  {
    path: '**',
    redirectTo: ''
  }
];
