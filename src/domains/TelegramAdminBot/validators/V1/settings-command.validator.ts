import { body } from 'express-validator';

export const settingsCommandValidator = [
  body('alerts_enabled').optional().isBoolean(),
  body('schedule_time').optional().matches(/^\d{2}:\d{2}$/)
];
