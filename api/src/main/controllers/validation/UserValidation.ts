import { check } from 'express-validator';
import { USER_ROLES } from '../../types/permissions';

const create = [
  check('username')
    .exists()
    .withMessage('Username is required')
    .isString()
    .withMessage('Username must be a string')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .trim(),
  check('password')
    .exists()
    .withMessage('Password is required')
    .isString()
    .withMessage('Password must be a string')
    .isLength({ min: 5 })
    .withMessage('Password must have at least 5 characters')
    .custom(value => !/\s/.test(value))
    .withMessage('Password cannot contain whitespace'),
  check('role')
    .optional()
    .isIn(USER_ROLES)
    .withMessage(`Role must be one of: ${USER_ROLES.join(", ")}`)
];

const update = [
  check('username')
    .optional()
    .isString()
    .withMessage('Username must be a string')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .trim(),
  check('password')
    .optional()
    .isString()
    .withMessage('Password must be a string')
    .isLength({ min: 5 })
    .withMessage('Password must have at least 5 characters')
    .custom(value => !/\s/.test(value))
    .withMessage('Password cannot contain whitespace'),
  check('role')
    .optional()
    .isIn(USER_ROLES)
    .withMessage(`Role must be one of: ${USER_ROLES.join(", ")}`)
];

const login = [
  check('username')
    .exists()
    .withMessage('Username is required')
    .isString()
    .withMessage('Username must be a string'),
  check('password')
    .exists()
    .withMessage('Password is required')
    .isString()
    .withMessage('Password must be a string')
];

const changeRole = [
  check('role')
    .exists()
    .withMessage('Role is required')
    .isIn(USER_ROLES)
    .withMessage(`Role must be one of: ${USER_ROLES.join(", ")}`)
];

export { create, login, update, changeRole };
