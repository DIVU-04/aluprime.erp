import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'aluprime_token';
  currentUser = signal<User | null>(null);

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {
    this.loadUser();
  }

  get token(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  get isLoggedIn(): boolean {
    return !!this.token;
  }

  login(email: string, password: string) {
    return this.http
      .post<{ access_token: string; user: User }>(`${environment.apiUrl}/auth/login`, {
        email,
        password,
      })
      .pipe(
        tap((res) => {
          localStorage.setItem(this.tokenKey, res.access_token);
          this.currentUser.set(res.user);
        }),
      );
  }

  register(data: { email: string; password: string; firstName: string; lastName: string }) {
    return this.http
      .post<{ access_token: string; user: User }>(`${environment.apiUrl}/auth/register`, data)
      .pipe(
        tap((res) => {
          localStorage.setItem(this.tokenKey, res.access_token);
          this.currentUser.set(res.user);
        }),
      );
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  private loadUser() {
    if (!this.token) return;
    this.http.get<User>(`${environment.apiUrl}/auth/profile`).subscribe({
      next: (user) => this.currentUser.set(user),
      error: () => this.logout(),
    });
  }
}
