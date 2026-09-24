import { cacheService } from "./cache.service";

/**
 * Invalidates a cache key after a create/update/delete operation.
 * Centralising this in one helper (rather than calling
 * cacheService.delete directly at every call site) makes it easy to
 * extend later — e.g. adding logging, metrics, or invalidating a
 * group of related keys in one call.
 */
export async function invalidateCache(key: string): Promise<void> {
  await cacheService.delete(key);
}

/**
 * Invalidates multiple related cache keys at once — for cases where
 * one write affects more than one cached view (e.g. a resource's own
 * cache plus an aggregate/dashboard cache derived from it).
 */
export async function invalidateRelatedCache(keys: string[]): Promise<void> {
  await cacheService.deleteMany(keys);
}