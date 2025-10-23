/*
 * @Description: 
 * @Usage: 
 * @Author: richen
 * @Date: 2022-02-10 17:40:55
 * @LastEditTime: 2024-02-01 10:48:46
 */
import * as Helper from "koatty_lib";
import { Exception } from "./exception";

const PREVENT_NEXT_PROCESS = 'PREVENT_NEXT_PROCESS';

/**
 * Prevent next process
 *
 * @returns {Promise<never>}
 */
export function prevent(): Promise<never> {
  return Promise.reject(new Error(PREVENT_NEXT_PROCESS));
}

/**
 * Check if the error is a predefined exception
 * 
 * @param {unknown} err - The error to check
 * @returns {err is Exception} Type guard for Exception
 */
export const isException = (err: unknown): err is Exception => {
  if (err instanceof Exception) {
    return true;
  }
  
  // 检查是否具有 Exception 的特征
  return !!(
    err && 
    typeof err === 'object' && 
    'type' in err && 
    (err as any).type === "Exception" &&
    'message' in err &&
    'code' in err &&
    'status' in err
  );
};

/**
 * Create a safe error object from unknown input
 * 
 * @param {unknown} err - The error input
 * @returns {Error} Safe error object
 */
export function toSafeError(err: unknown): Error {
  if (Helper.isError(err)) {
    return err;
  }
  
  if (isException(err)) {
    return err;
  }
  
  if (typeof err === 'string') {
    return new Error(err);
  }
  
  if (typeof err === 'number') {
    return new Error(String(err));
  }
  
  if (typeof err === 'boolean') {
    return new Error(String(err));
  }
  
  if (err && typeof err === 'object' && 'message' in err) {
    return new Error(String((err as any).message));
  }
  
  return new Error('Unknown error occurred');
}

/**
 * Check if an error is a network error
 * 
 * @param {unknown} err - The error to check
 * @returns {boolean} True if it's a network error
 */
export function isNetworkError(err: unknown): boolean {
  if (!Helper.isError(err)) {
    return false;
  }
  
  const networkErrorCodes = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'];
  return networkErrorCodes.includes((err as any).code);
}

