import { Component, forwardRef, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-grind-slider',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './grind-slider.component.html',
  styleUrl: './grind-slider.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => GrindSliderComponent),
      multi: true
    }
  ]
})
export class GrindSliderComponent implements ControlValueAccessor {
  value = 5;
  disabled = false;
  ticks = [1, 5, 10, 15, 20, 25, 30];

  private onChange: (value: number) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private cdr: ChangeDetectorRef) {}

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.value = Number(input.value);
    this.onChange(this.value);
  }

  onBlur(): void {
    this.onTouched();
  }

  writeValue(value: number | null): void {
    this.value = value ?? 5;
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
