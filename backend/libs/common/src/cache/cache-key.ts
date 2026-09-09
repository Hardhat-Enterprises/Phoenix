/**
 * Builds a standardised cache key following the convention:
 * phoenix:{environment}:{service}:{resource}:{identifier}
 *
 * Keeps keys namespaced so different environments and services
 * can't accidentally collide or overwrite each other's cached data.
 */
export function createCacheKey(
  service: string,
  resource: string,
  identifier: string,
): string {
  const environment = process.env.NODE_ENV || "development";
  return `phoenix:${environment}:${service}:${resource}:${identifier}`;
}