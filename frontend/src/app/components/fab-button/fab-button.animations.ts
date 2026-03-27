import { trigger, transition, style, animate } from '@angular/animations';

export const fabEnter = trigger('fabEnter', [
  transition(':enter', [
    style({ transform: 'scale(0)', opacity: 0 }),
    animate('300ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ transform: 'scale(1)', opacity: 1 }))
  ])
]);
