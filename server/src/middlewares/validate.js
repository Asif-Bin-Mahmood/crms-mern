import { validationResult } from 'express-validator';
import { fail } from '../utils/response.js';

export function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return fail(res, 'Validation failed', 422, errors.array());
  }
  return next();
}
