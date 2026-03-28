import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BeanService } from '../../services/bean.service';
import { BeanEntryPayload, RoastLevel } from '../../models/bean.models';
import { FormFieldComponent } from '../form-field/form-field.component';

@Component({
  selector: 'app-bean-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, FormFieldComponent],
  templateUrl: './bean-form-page.component.html',
  styleUrl: './bean-form-page.component.scss'
})
export class BeanFormPageComponent implements OnInit {
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
    private beanService: BeanService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      origin: ['', Validators.maxLength(100)],
      roastLevel: new FormControl<RoastLevel | null>(null),
      roastedAt: new FormControl<string | null>(null),
      flavorNotes: ['', Validators.maxLength(500)],
      bagWeightGrams: new FormControl<number | null>(null, [Validators.min(1), Validators.max(2000)]),
      notes: ['', Validators.maxLength(1000)],
    });

    this.editId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.editId;

    if (this.editId) {
      const entry = this.beanService.getBeanById(this.editId);
      if (entry) {
        this.form.patchValue({
          name: entry.name,
          origin: entry.origin ?? '',
          roastLevel: entry.roastLevel ?? null,
          roastedAt: entry.roastedAt ?? null,
          flavorNotes: (entry.flavorNotes ?? []).join(', '),
          bagWeightGrams: entry.bagWeightGrams ?? null,
          notes: entry.notes ?? '',
        });
      } else {
        console.warn(`[BeanFormPage] Entry id "${this.editId}" not found — redirecting to bean journal.`);
        this.router.navigate(['/beans']);
      }
    }
  }

  selectRoastLevel(level: RoastLevel): void {
    const current = this.form.get('roastLevel')?.value;
    this.form.patchValue({ roastLevel: current === level ? null : level });
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

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.value;
    const payload: BeanEntryPayload = {
      name: raw['name'].trim(),
      origin: raw['origin']?.trim() || null,
      roastLevel: raw['roastLevel'] ?? null,
      roastedAt: raw['roastedAt'] || null,
      flavorNotes: (raw['flavorNotes'] as string ?? '')
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0),
      bagWeightGrams: raw['bagWeightGrams'] ? Number(raw['bagWeightGrams']) : null,
      notes: raw['notes']?.trim() || null,
    };

    this.submitting = true;
    this.submitError = null;

    if (this.isEditMode && this.editId) {
      this.beanService.updateBean(this.editId, payload).subscribe({
        next: () => this.router.navigate(['/beans']),
        error: (err) => {
          console.error('[BeanFormPage] Update failed', err);
          this.submitError = 'Failed to update bean. Please try again.';
          this.submitting = false;
        }
      });
    } else {
      this.beanService.addBean(payload).subscribe({
        next: () => this.router.navigate(['/beans']),
        error: (err) => {
          console.error('[BeanFormPage] Add failed', err);
          this.submitError = 'Failed to save bean. Please try again.';
          this.submitting = false;
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/beans']);
  }
}
