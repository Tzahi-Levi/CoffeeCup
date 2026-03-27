import { trigger, transition, query, stagger, animateChild } from '@angular/animations';

export const listAnimation = trigger('listAnimation', [
  transition('* => *', [
    query(':enter', [stagger(50, [animateChild()])], { optional: true }),
    query(':leave', [stagger(30, [animateChild()])], { optional: true })
  ])
]);
