import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js';
import { BehaviorSubject, filter, take } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase: SupabaseClient = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
    auth: {
      // The Web Locks API Supabase uses to serialize session access fails in
      // sandboxed environments (Vercel preview iframes). A no-op lock keeps
      // getSession() working; the tradeoff is no cross-tab refresh serialization.
      lock: <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => fn(),
    },
  });

  readonly session = signal<Session | null>(null);
  readonly user = signal<User | null>(null);

  private _ready$ = new BehaviorSubject<boolean>(false);
  readonly isReady$ = this._ready$.pipe(filter(v => v), take(1));

  constructor(private router: Router) {
    this.supabase.auth.getSession().then(({ data }) => {
      this.session.set(data.session);
      this.user.set(data.session?.user ?? null);
      this._ready$.next(true);
    }).catch(() => {
      // Ensure the guard never hangs even if getSession() rejects
      this._ready$.next(true);
    });
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.session.set(session);
      this.user.set(session?.user ?? null);
    });
  }

  getAccessToken(): string | null {
    return this.session()?.access_token ?? null;
  }

  async signIn(email: string, password: string): Promise<{ error: unknown }> {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (!error) this.router.navigate(['/']);
    return { error };
  }

  async signUp(email: string, password: string) {
    return this.supabase.auth.signUp({ email, password });
  }

  async signInWithGoogle(): Promise<void> {
    await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
  }

  async signInWithGitHub(): Promise<void> {
    await this.supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/` },
    });
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return this.session() !== null;
  }
}
