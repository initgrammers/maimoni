export type ApiDeps = {
  db: ReturnType<typeof import('@maimoni/db').createClient>;
};
