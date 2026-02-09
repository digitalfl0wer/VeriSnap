import "server-only";

export function isAdminRequest(request: Request): boolean {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) return false;

  const provided = request.headers.get("x-admin-key")?.trim();
  return Boolean(provided && provided === expected);
}

export function assertAdmin(request: Request): void {
  if (!process.env.ADMIN_API_KEY) {
    throw new Error("Missing env var: ADMIN_API_KEY");
  }
  if (!isAdminRequest(request)) {
    throw new Error("Unauthorized");
  }
}
