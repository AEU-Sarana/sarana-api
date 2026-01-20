/**
 * API version configuration
 */
export const API_VERSIONS = {
    DEFAULT: 'v1',
    SUPPORTED: ['v1', 'v2'], // v2 for future
    LATEST: 'v1',
  } as const;
  
  /**
   * Get API version from request
   */
  export function getApiVersion(version?: string): string {
    if (!version) return API_VERSIONS.DEFAULT;
    
    if (API_VERSIONS.SUPPORTED.includes(version as typeof API_VERSIONS.SUPPORTED[number])) {
      return version;
    }
    
    return API_VERSIONS.DEFAULT;
  }
  
  /**
   * Check if API version is supported
   */
  export function isSupportedVersion(version: string): boolean {
    return API_VERSIONS.SUPPORTED.includes(version as typeof API_VERSIONS.SUPPORTED[number]);
  }