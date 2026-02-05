import { body } from 'express-validator';

export const linkAdminValidator = [
  body('link_code').isLength({ min: 6, max: 6 }).withMessage('Link code must be 6 digits')
];
