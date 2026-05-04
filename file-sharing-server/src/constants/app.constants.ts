import { HttpStatus } from '@nestjs/common';

export const APP_STATUS_CODES = {
  OK: HttpStatus.OK,
  CREATED: HttpStatus.CREATED,
  BAD_REQUEST: HttpStatus.BAD_REQUEST,
  UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
  INTERNAL_SERVER_ERROR: HttpStatus.INTERNAL_SERVER_ERROR,
} as const;

export const USER_MESSAGES = {
  REQUIRED_FIELDS: 'Username, email, and password are required',
  EMAIL_EXISTS: 'Email is already in use',
  USERNAME_EXISTS: 'Username is already taken',
  DUPLICATE_USER: 'User with provided credentials already exists',
  CREATE_USER_FAILED: 'Failed to create user',
} as const;

export const DATABASE_MESSAGES = {
  QUERY_FAILED: 'Database query failed',
  OPERATION_FAILED: 'Database operation failed',
} as const;

export const SECURITY = {
  PASSWORD_SALT_ROUNDS: 12,
} as const;

export const POSTGRES_ERROR_CODES = {
  UNIQUE_VIOLATION: '23505',
} as const;

export const AUTH_MESSAGES = {
  REGISTER_SUCCESS: 'User registered successfully',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logged out successfully',
  INVALID_CREDENTIALS: 'Invalid email or password',
  UNAUTHORIZED: 'Unauthorized',
} as const;

export const COOKIE = {
  ACCESS_TOKEN: 'access_token',
} as const;
