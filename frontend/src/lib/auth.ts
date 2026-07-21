import Cookies from 'js-cookie';

const TOKEN_KEY = 'airefy_token';

export function getToken(): string | undefined {
  return Cookies.get(TOKEN_KEY);
}

export function setToken(token: string): void {
  Cookies.set(TOKEN_KEY, token, {
    expires: 7,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
  });
}

export function removeToken(): void {
  Cookies.remove(TOKEN_KEY);
}
