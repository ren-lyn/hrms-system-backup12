/**
 * Request deduplication utility to prevent duplicate concurrent API calls
 * Ensures only one request is made for the same endpoint with same parameters
 */

class RequestDeduplicator {
  constructor() {
    this.pendingRequests = new Map();
  }

  /**
   * Generate a unique key for the request
   */
  generateKey(url, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});
    return `${url}_${JSON.stringify(sortedParams)}`;
  }

  /**
   * Execute request with deduplication
   * If same request is pending, return the existing promise
   */
  async dedupe(key, requestFn) {
    // If request is already pending, return existing promise
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    // Create new request promise
    const promise = requestFn()
      .then(result => {
        this.pendingRequests.delete(key);
        return result;
      })
      .catch(error => {
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Clear all pending requests
   */
  clear() {
    this.pendingRequests.clear();
  }

  /**
   * Clear specific request by key
   */
  clearRequest(key) {
    this.pendingRequests.delete(key);
  }
}

// Create singleton instance
const requestDeduplicator = new RequestDeduplicator();

export default requestDeduplicator;
