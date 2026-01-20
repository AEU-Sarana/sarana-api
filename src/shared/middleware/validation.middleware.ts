import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { ValidationException } from '@src/shared/exceptions';

export function validate(validations: ValidationChain[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationException('Validation failed', errors.array());
    }

    next();
  };
}

export function validateRequest(validations: ValidationChain[]) {
  return [validations, validate(validations)];
}