/**
 * Standard API response envelope used by every endpoint.
 *
 * Success: { success: true, data: <T> }
 * Error:   { success: false, message: <string> }
 */

export type ApiSuccess<T> = { success: true; data: T };
export type ApiError = { success: false; message: string };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export const success = <T>(data: T): ApiSuccess<T> => ({
  success: true,
  data,
});

export const error = (message: string): ApiError => ({
  success: false,
  message,
});
