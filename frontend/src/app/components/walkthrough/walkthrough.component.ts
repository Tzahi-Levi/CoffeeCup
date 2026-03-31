import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
} from '@angular/core';
import { WalkthroughService } from '../../services/walkthrough.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-walkthrough',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './walkthrough.component.html',
  styleUrl: './walkthrough.component.scss',
})
export class WalkthroughComponent {
  protected wt = inject(WalkthroughService);
  private auth = inject(AuthService);

  protected step = computed(() => this.wt.steps[this.wt.currentStep()]);
  protected isLast = computed(() => this.wt.currentStep() === this.wt.totalSteps - 1);
  protected isFirst = computed(() => this.wt.currentStep() === 0);

  protected get dots(): number[] {
    return Array.from({ length: this.wt.totalSteps }, (_, i) => i);
  }

  protected skip(): void {
    this.wt.dismiss(this.auth.user()?.id ?? '');
  }

  protected next(): void {
    if (this.isLast()) {
      this.wt.dismiss(this.auth.user()?.id ?? '');
    } else {
      this.wt.next();
    }
  }

  protected prev(): void {
    this.wt.prev();
  }
}
