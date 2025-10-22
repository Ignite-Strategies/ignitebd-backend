import 'express-session';

declare module 'cookie-session' {
  interface CookieSessionObject {
    user?: {
      id: string;
      email: string;
    };
  }
}

