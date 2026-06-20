import "express-session";

declare module "express-session" {
  interface SessionData {
    adminUser?: {
      id: number;
      username: string;
      role: string;
      displayName: string;
    };
  }
}
