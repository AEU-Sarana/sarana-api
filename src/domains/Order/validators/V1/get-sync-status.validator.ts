import { query } from 'express-validator';

export const getSyncStatusValidator = [
  query('order_uuids').notEmpty().withMessage('Order UUIDs are required'),
  query('order_uuids').custom((value) => {
    const uuids = (value as string).split(',');
    return uuids.every((uuid) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid.trim()));
  }).withMessage('All UUIDs must be valid UUID format'),
];