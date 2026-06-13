/** Minimal chainable Supabase fake for engine integration tests. */
export interface Captured { table: string; action: string; payload?: unknown; filters: Record<string, unknown> }

type RouterResult = { data?: unknown; error?: { message: string } | null; count?: number };
export type Router = (q: Captured) => RouterResult;

class Builder implements PromiseLike<RouterResult> {
  action = "select";
  payload: unknown;
  filters: Record<string, unknown> = {};
  private headCount = false;
  constructor(private table: string, private router: Router, private log: Captured[]) {}
  select(_cols?: string, opts?: { head?: boolean; count?: string }) { if (opts?.head) { this.headCount = true; this.action = this.action === "select" ? "count" : this.action; } return this; }
  insert(payload: unknown) { this.action = "insert"; this.payload = payload; return this; }
  update(payload: unknown) { this.action = "update"; this.payload = payload; return this; }
  eq(k: string, v: unknown) { this.filters[k] = v; return this; }
  neq(k: string, v: unknown) { this.filters["neq:" + k] = v; return this; }
  gt(k: string, v: unknown) { this.filters["gt:" + k] = v; return this; }
  in(k: string, v: unknown) { this.filters["in:" + k] = v; return this; }
  order() { return this; }
  limit() { return this; }
  maybeSingle() { return this.resolve(); }
  single() { return this.resolve(); }
  private resolve(): Promise<RouterResult> {
    const cap: Captured = { table: this.table, action: this.action, payload: this.payload, filters: this.filters };
    this.log.push(cap);
    const r = this.router(cap) ?? {};
    return Promise.resolve({ data: r.data ?? null, error: r.error ?? null, count: r.count });
  }
  then<T1 = RouterResult, T2 = never>(onf?: ((v: RouterResult) => T1 | PromiseLike<T1>) | null, onr?: ((r: unknown) => T2 | PromiseLike<T2>) | null) {
    return this.resolve().then(onf, onr);
  }
}

export function makeFakeDb(router: Router) {
  const log: Captured[] = [];
  const db = {
    from: (table: string) => new Builder(table, router, log),
    rpc: (fn: string, args: unknown) => {
      const cap: Captured = { table: "rpc:" + fn, action: "rpc", payload: args, filters: {} };
      log.push(cap);
      const r = router(cap) ?? {};
      return Promise.resolve({ data: r.data ?? null, error: r.error ?? null });
    },
    __log: log,
  };
  return db;
}
