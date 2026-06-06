import { Order } from '@src/database/generated';

declare global {
  namespace Express {
    interface Request {
      user?: import('../shared/middleware/auth.middleware').UserPayload;
      order?: Order;
      apiVersion?: string;
    }
    
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination?: string;
        filename?: string;
        path?: string;
        buffer: Buffer;
      }
    }
  }
}
