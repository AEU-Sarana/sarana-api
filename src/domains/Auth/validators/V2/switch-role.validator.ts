import { body } from 'express-validator';
import { Role } from '@src/shared/config/permissions';

export const switchRoleValidator = [
    body('role')
        .notEmpty()
        .withMessage('Role is required')
        .isIn([Role.ADMIN, Role.SELLER])
        .withMessage('Invalid role'),
];
