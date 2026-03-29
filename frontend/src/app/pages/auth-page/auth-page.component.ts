import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './auth-page.component.html',
  styleUrl: './auth-page.component.scss',
})
export class AuthPageComponent {
  activeTab = signal<'signin' | 'signup'>('signin');
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  isLoading = signal(false);

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    public auth: AuthService,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  setTab(tab: 'signin' | 'signup'): void {
    this.activeTab.set(tab);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.form.reset();
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.isLoading()) return;
    const { email, password } = this.form.value as { email: string; password: string };
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (this.activeTab() === 'signin') {
      const { error } = await this.auth.signIn(email, password);
      if (error) {
        this.errorMessage.set((error as { message?: string }).message ?? 'Sign in failed');
        this.isLoading.set(false);
      }
      // On success, AuthService navigates to '/'
    } else {
      const { error } = await this.auth.signUp(email, password);
      this.isLoading.set(false);
      if (error) {
        this.errorMessage.set((error as { message?: string }).message ?? 'Sign up failed');
      } else {
        this.successMessage.set('Check your email for a confirmation link.');
        this.form.reset();
      }
    }
  }

  async onGoogle(): Promise<void> {
    await this.auth.signInWithGoogle();
  }

  async onGitHub(): Promise<void> {
    await this.auth.signInWithGitHub();
  }
}
