import { body, check } from 'express-validator';

const getById = [
  check('organizationId')
    .exists().withMessage('organizationId parameter is required')
    .isString().withMessage('organizationId must be a string')
    .isLength({ min: 24, max: 24 }).withMessage('organizationId must be a valid 24-character hex string'),
]

const create = [
  check('name')
    .exists().withMessage('Organization name is required')
    .isString().withMessage('Organization name must be a string')
    .notEmpty().withMessage('Organization name cannot be empty')
    .isLength({ min: 3 }).withMessage('Organization name must be at least 3 characters long'),
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

const addMember = [
  check('organizationId')
    .exists().withMessage('organizationId parameter is required')
    .isString().withMessage('organizationId must be a string')
    .isLength({ min: 24, max: 24 }).withMessage('organizationId must be a valid 24-character hex string'),
  body('username')
    .exists().withMessage('Member username is required')
    .notEmpty().withMessage('Member username cannot be empty')
    .isString().withMessage('Member username must be a string'),
  body('role')
    .exists().withMessage('Member role is required')
    .notEmpty().withMessage('Member role cannot be empty')
    .isIn(['ADMIN', 'MANAGER', 'EVALUATOR']).withMessage('Member role must be one of ADMIN, MANAGER, EVALUATOR')
]

export { create, update, getById, addMember };