import { body } from 'express-validator';

export const verifyReceiptValidator = [
  body('qr').optional().isString().trim(),
  body('payload').optional().isObject(),
  body('signature').optional().isString().trim(),
  body().custom((value) => {
    if (value.qr) return true;
    if (value.payload && value.signature) return true;
    throw new Error('qr or payload+signature is required');
  }),
];
