import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-form-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.scss'
})
export class FormFieldComponent {
  @Input() label: string = '';
  @Input() errorMessage: string = '';
}
