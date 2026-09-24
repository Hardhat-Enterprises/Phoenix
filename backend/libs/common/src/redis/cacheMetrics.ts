export class CacheMetrics {
    private hits = 0;
    private misses = 0;
    private errors = 0;
    private timeouts = 0;

    incrementHit() {
        this.hits++;
    }

    incrementMiss() {
        this.misses++;
    }

    incrementError() {
        this.errors++;
    }

    incrementTimeout() {
        this.timeouts++;
    }

    getMetrics() {
        return {
            hits: this.hits,
            misses: this.misses,
            errors: this.errors,
            timeouts: this.timeouts,
        };
    }

    reset() {
        this.hits = 0;
        this.misses = 0;
        this.errors = 0;
        this.timeouts = 0;
    }
}

export const cacheMetrics = new CacheMetrics();