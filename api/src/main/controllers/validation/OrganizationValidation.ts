import { body, check } from 'express-validator';

const create = [
  check('name')
    .exists().withMessage('Organization name is required')
    .isString().withMessage('Organization name must be a string'),
  check('owner')
    .exists().withMessage('Owner username is required')
    .isString().withMessage('Owner username must be a string')
] 

const update = [
  body('name')
    .optional()
    .isString().withMessage('Organization name must be a string'),
  body('owner')
    .optional()
    .isString().withMessage('Owner username must be a string')
];

export { create, update };
