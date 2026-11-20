declare module 'next/headers' {
  export interface CookieItem {
    name: string;
    value: string;
    [key: string]: unknown;
  }
  export interface CookieStore {
    getAll(): CookieItem[];
    set(name: string, value: string, options?: unknown): void;
    get?(name: string): CookieItem | undefined;
  }
  export function cookies(): Promise<CookieStore>;
}

declare module 'next/server' {
  export interface NextRequest {
    headers: Headers | Record<string, string>;
    cookies: {
      getAll(): Array<{ name: string; value: string }>;
      set(name: string, value: string): void;
    };
  }
  export class NextResponse {
    static next(options?: unknown): NextResponse;
    cookies: {
      set(name: string, value: string, options?: unknown): void;
    };
  }
}
