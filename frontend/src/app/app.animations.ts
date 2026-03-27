import { trigger, transition, style, animate, query, group } from '@angular/animations';

export const pageSlide = trigger('pageSlide', [
  transition('LibraryPage => FormPage', [
    query(':enter, :leave', style({ position: 'absolute', width: '100%' }), { optional: true }),
    group([
      query(':leave', [animate('250ms ease-in', style({ opacity: 0, transform: 'translateX(-20px)' }))], { optional: true }),
      query(':enter', [
        style({ opacity: 0, transform: 'translateX(20px)' }),
        animate('250ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ], { optional: true })
    ])
  ]),
  transition('FormPage => LibraryPage', [
    query(':enter, :leave', style({ position: 'absolute', width: '100%' }), { optional: true }),
    group([
      query(':leave', [animate('250ms ease-in', style({ opacity: 0, transform: 'translateX(20px)' }))], { optional: true }),
      query(':enter', [
        style({ opacity: 0, transform: 'translateX(-20px)' }),
        animate('250ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ], { optional: true })
    ])
  ])
]);
