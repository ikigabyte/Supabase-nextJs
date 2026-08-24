export const DEFAULT_DATABASE_PATH = "/database/toprint?rush";

export function getDatabaseRedirectPath(value?: string | null) {
  if (value === "/database" || value?.startsWith("/database/") || value?.startsWith("/database?")) {
    return value;
  }

  return DEFAULT_DATABASE_PATH;
}
