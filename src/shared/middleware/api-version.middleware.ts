import { Request, Response, NextFunction } from 'express';
import { API_VERSIONS } from '@src/shared/config/api-version';

export function apiVersionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Extract version from header or query
  const headerVersion = req.headers['api-version'];
  const queryVersion = req.query.version;
  
  let version: string = API_VERSIONS.DEFAULT;
  
  if (headerVersion) {
    version = Array.isArray(headerVersion) ? headerVersion[0] : String(headerVersion);
  } else if (queryVersion) {
    const queryStr = Array.isArray(queryVersion) ? queryVersion[0] : queryVersion;
    version = typeof queryStr === 'string' ? queryStr : String(queryStr);
  }

  // Validate version
  if (!API_VERSIONS.SUPPORTED.includes(version as typeof API_VERSIONS.SUPPORTED[number])) {
    res.status(400).json({
      success: false,
      message: `Unsupported API version: ${version}`,
      code: 'UNSUPPORTED_API_VERSION',
      supportedVersions: API_VERSIONS.SUPPORTED,
    });
    return;
  }

  req.apiVersion = version;
  next();
}