export interface Bindings extends Cloudflare.Env {
  APP_PIN: string;
  SESSION_SECRET: string;
}

export interface Variables {
  authed: boolean;
}

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
