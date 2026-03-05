import { body } from 'express-validator';

export const updateProfileValidator = [
    body('full_name')
        .optional()
        .isString()
        .withMessage('Full name must be a string')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Full name must be between 2 and 100 characters'),

    body('email')
        .optional()
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail(),

    body('username')
        .optional()
        .isString()
        .withMessage('Username must be a string')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Username must be between 2 and 100 characters'),

    body('phone')
        .optional()
        .isString()
        .withMessage('Phone must be a string')
        .matches(/^\+?[0-9\s-]{8,20}$/)
        .withMessage('Invalid phone format'),

    body('bio')
        .optional()
        .isString()
        .withMessage('Bio must be a string')
        .trim()
        .isLength({ max: 500 })
        .withMessage('Bio cannot exceed 500 characters'),
];
