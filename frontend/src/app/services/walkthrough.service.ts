import { Injectable, signal } from '@angular/core';

export interface WalkthroughStep {
  icon: string;
  title: string;
  description: string;
}

export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    icon: '☕',
    title: 'Welcome to CoffeeCup',
    description: 'Your personal coffee recipe manager. Let\'s take a quick tour of what you can do.',
  },
  {
    icon: '📖',
    title: 'Your Recipe Library',
    description: 'Save all your coffee recipes — espresso, pour-over, French press, and more. Search and filter to find exactly what you\'re looking for.',
  },
  {
    icon: '✏️',
    title: 'Create a Recipe',
    description: 'Tap the + button to log a new recipe. Record grind level, dose, brew time, and your personal rating.',
  },
  {
    icon: '📊',
    title: 'Track Your Brews',
    description: 'Open any recipe to see its detail page. Log individual brew sessions and track how each shot turns out over time.',
  },
  {
    icon: '🔧',
    title: 'Equipment Maintenance',
    description: 'Keep your gear in top shape with the Maintenance section. Track cleaning cycles and service intervals for your equipment.',
  },
  {
    icon: '🚀',
    title: 'You\'re all set!',
    description: 'That\'s everything. Start by adding your first recipe — happy brewing!',
  },
];

const STORAGE_KEY_PREFIX = 'coffeecup_walkthrough_seen_';

@Injectable({ providedIn: 'root' })
export class WalkthroughService {
  readonly visible = signal(false);
  readonly currentStep = signal(0);

  readonly steps = WALKTHROUGH_STEPS;
  get totalSteps(): number { return this.steps.length; }

  checkAndShow(userId: string): void {
    const key = STORAGE_KEY_PREFIX + userId;
    if (!localStorage.getItem(key)) {
      this.currentStep.set(0);
      this.visible.set(true);
    }
  }

  next(): void {
    const next = this.currentStep() + 1;
    if (next >= this.totalSteps) {
      this.dismiss('');
    } else {
      this.currentStep.set(next);
    }
  }

  prev(): void {
    const prev = this.currentStep() - 1;
    if (prev >= 0) {
      this.currentStep.set(prev);
    }
  }

  dismiss(userId: string): void {
    if (userId) {
      localStorage.setItem(STORAGE_KEY_PREFIX + userId, '1');
    }
    this.visible.set(false);
  }
}
