import { HttpClient } from '@angular/common/http';
import { inject, Service, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export interface AuthRequest {
  username: string;
  password: string;
  email?: string;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  userId: number;
  username: string;
  email: string;
  role: string;
}

@Service()
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private base = `${environment.apiUrl}/api/auth`;

  private _user = signal<AuthResponse | null>(this.loadUser());
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => !!this._user());
  readonly username = computed(() => this._user()?.username ?? '');

  register(username: string, email: string, password: string) {
    return this.http
      .post<AuthResponse>(`${this.base}/register`, { username, email, password })
      .pipe(tap(res => this.setSession(res)));
  }

  login(username: string, password: string) {
    return this.http
      .post<AuthResponse>(`${this.base}/login`, { username, password })
      .pipe(tap(res => this.setSession(res)));
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private setSession(res: AuthResponse) {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res));
    this._user.set(res);
  }

  private loadUser(): AuthResponse | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
