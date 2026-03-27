import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  FormControl,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CoffeeService } from '../../services/coffee.service';
import { CoffeeEntryPayload, RoastLevel, CoffeeType, BlendComponent } from '../../models/coffee.models';
import { FormFieldComponent } from '../form-field/form-field.component';
import { GrindSliderComponent } from '../grind-slider/grind-slider.component';
import { StarRatingComponent } from '../star-rating/star-rating.component';

/** Validates that all blend component percentages sum to exactly 100. */
function blendTotalValidator(control: AbstractControl): ValidationErrors | null {
  const arr = control as FormArray;
  if (!arr.length) return null;
  const total = (arr.value as { origin: string; percentage: number }[])
    .reduce((sum, c) => sum + Number(c.percentage || 0), 0);
  return total === 100 ? null : { blendTotal: { actual: total } };
}

@Component({
  selector: 'app-coffee-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, FormFieldComponent, GrindSliderComponent, StarRatingComponent],
  templateUrl: './coffee-form-page.component.html',
  styleUrl: './coffee-form-page.component.scss'
})
export class CoffeeFormPageComponent implements OnInit {
  form!: FormGroup;
  editId: string | null = null;
  isEditMode = false;
  submitting = false;
  submitError: string | null = null;

  readonly roastLevels: { value: RoastLevel; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'medium-light', label: 'Medium-Light' },
    { value: 'medium', label: 'Medium' },
    { value: 'medium-dark', label: 'Medium-Dark' },
    { value: 'dark', label: 'Dark' },
  ];

  constructor(
    private fb: FormBuilder,
    private coffeeService: CoffeeService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      origin: ['', Validators.maxLength(100)],
      grindLevel: [5, [Validators.required, Validators.min(1), Validators.max(30)]],
      doseGrams: [18, [Validators.required, Validators.min(1), Validators.max(50)]],
      brewTimeSeconds: [30, [Validators.required, Validators.min(5), Validators.max(120)]],
      notes: ['', Validators.maxLength(1000)],
      rating: [null],
      roastLevel: new FormControl<RoastLevel | null>(null),
      coffeeType: new FormControl<CoffeeType | null>(null),
      blendComponents: this.fb.array([], blendTotalValidator)
    });

    this.editId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.editId;

    if (this.editId) {
      const entry = this.coffeeService.getCoffeeById(this.editId);
      if (entry) {
        this.form.patchValue({
          name: entry.name,
          origin: entry.origin ?? '',
          grindLevel: entry.grindLevel,
          doseGrams: entry.doseGrams,
          brewTimeSeconds: entry.brewTimeSeconds,
          notes: entry.notes ?? '',
          rating: entry.rating,
          roastLevel: entry.roastLevel ?? null,
          coffeeType: entry.coffeeType ?? null,
        });
        // Rebuild blend components FormArray from saved entry
        const components = entry.blendComponents ?? [];
        components.forEach((c) => this.blendComponents.push(this.createBlendComponentGroup(c)));
      } else {
        console.warn(`[CoffeeFormPage] Entry id "${this.editId}" not found — redirecting to library.`);
        this.router.navigate(['/']);
      }
    }
  }

  get blendComponents(): FormArray {
    return this.form.get('blendComponents') as FormArray;
  }

  get blendTotal(): number {
    return (this.blendComponents.value as { origin: string; percentage: number }[])
      .reduce((sum, c) => sum + Number(c.percentage || 0), 0);
  }

  get isBlend(): boolean {
    return this.form.get('coffeeType')?.value === 'blend';
  }

  private createBlendComponentGroup(c?: Partial<BlendComponent>): FormGroup {
    return this.fb.group({
      origin: new FormControl<string>(c?.origin ?? '', Validators.required),
      percentage: new FormControl<number>(c?.percentage ?? 0, [
        Validators.required,
        Validators.min(1),
        Validators.max(100)
      ])
    });
  }

  addBlendComponent(): void {
    this.blendComponents.push(this.createBlendComponentGroup());
  }

  removeBlendComponent(index: number): void {
    this.blendComponents.removeAt(index);
  }

  selectRoastLevel(level: RoastLevel): void {
    const current = this.form.get('roastLevel')?.value;
    // Toggle off if already selected
    this.form.patchValue({ roastLevel: current === level ? null : level });
  }

  selectCoffeeType(type: CoffeeType): void {
    const current = this.form.get('coffeeType')?.value;
    if (current === type) {
      // Toggle off
      this.form.patchValue({ coffeeType: null });
    } else {
      this.form.patchValue({ coffeeType: type });
      // Clear blend components when switching to single-origin
      if (type === 'single-origin') {
        while (this.blendComponents.length) {
          this.blendComponents.removeAt(0);
        }
      }
    }
  }

  onRatingChange(rating: number): void {
    this.form.patchValue({ rating });
  }

  getError(field: string): string {
    const ctrl = this.form.get(field);
    if (!ctrl || !ctrl.touched || ctrl.valid) return '';
    if (ctrl.errors?.['required']) return 'This field is required';
    if (ctrl.errors?.['maxlength']) return `Max ${ctrl.errors['maxlength'].requiredLength} characters`;
    if (ctrl.errors?.['min']) return `Minimum value is ${ctrl.errors['min'].min}`;
    if (ctrl.errors?.['max']) return `Maximum value is ${ctrl.errors['max'].max}`;
    return 'Invalid value';
  }

  getBlendComponentError(index: number, field: 'origin' | 'percentage'): string {
    const ctrl = this.blendComponents.at(index)?.get(field);
    if (!ctrl || !ctrl.touched || ctrl.valid) return '';
    if (ctrl.errors?.['required']) return 'Required';
    if (ctrl.errors?.['min']) return `Min ${ctrl.errors['min'].min}`;
    if (ctrl.errors?.['max']) return `Max ${ctrl.errors['max'].max}`;
    return 'Invalid';
  }

  onSubmit(): void {
    // If blend type is selected but no components exist yet, add one and stop so
    // the user can fill it in rather than submitting an empty blend.
    if (this.isBlend && this.blendComponents.length === 0) {
      this.addBlendComponent();
      this.form.markAllAsTouched();
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.value;
    const payload: CoffeeEntryPayload = {
      name: raw['name'].trim(),
      origin: raw['origin']?.trim() || null,
      grindLevel: Number(raw['grindLevel']),
      doseGrams: Number(raw['doseGrams']),
      brewTimeSeconds: Number(raw['brewTimeSeconds']),
      notes: raw['notes']?.trim() || null,
      rating: raw['rating'] ? Number(raw['rating']) : null,
      roastLevel: raw['roastLevel'] ?? null,
      coffeeType: raw['coffeeType'] ?? null,
      blendComponents: ((raw['blendComponents'] ?? []) as { origin: string; percentage: number }[]).map((c) => ({
        origin: c.origin.trim(),
        percentage: Number(c.percentage)
      }))
    };

    this.submitting = true;
    this.submitError = null;

    if (this.isEditMode && this.editId) {
      this.coffeeService.updateCoffee(this.editId, payload).subscribe({
        next: () => this.router.navigate(['/']),
        error: (err) => {
          console.error('[CoffeeFormPage] Update failed', err);
          this.submitError = 'Failed to update coffee. Please try again.';
          this.submitting = false;
        }
      });
    } else {
      this.coffeeService.addCoffee(payload).subscribe({
        next: () => this.router.navigate(['/']),
        error: (err) => {
          console.error('[CoffeeFormPage] Add failed', err);
          this.submitError = 'Failed to save coffee. Please try again.';
          this.submitting = false;
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/']);
  }
}
