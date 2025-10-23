
/*
 * @Description: 
 * @Usage: 
 * @Author: richen
 * @Date: 2023-12-09 12:02:29
 * @LastEditTime: 2024-11-07 11:08:26
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

import { randomBytes, randomUUID } from "crypto";

/**
 * Performs a deep equality comparison between two objects.
 * @param obj1 - The first object to compare
 * @param obj2 - The second object to compare
 * @param visited - Set to track visited objects for circular reference detection
 * @returns {boolean} True if objects are deeply equal, false otherwise
 */
export function deepEqual(obj1: any, obj2: any, visited = new WeakSet()): boolean {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== typeof obj2) return false;

  if (typeof obj1 === 'object') {
    // Handle circular references
    if (visited.has(obj1)) return true;
    visited.add(obj1);
    
    // Check if both are arrays or both are objects
    const isArray1 = Array.isArray(obj1);
    const isArray2 = Array.isArray(obj2);
    if (isArray1 !== isArray2) return false;

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    if (keys1.length !== keys2.length) return false;

    const result = keys1.every(key => deepEqual(obj1[key], obj2[key], visited));
    visited.delete(obj1);
    return result;
  }

  return false;
}

/**
 * Execute operation with timeout
 */
export function executeWithTimeout<T>(
  operation: () => Promise<T> | T,
  timeout: number,
  operationName: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeout}ms`));
    }, timeout);

    Promise.resolve(operation())
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Generate short unique ID from UUID v4
 * Uses Node.js crypto module for cryptographically strong randomness
 * Removes hyphens and takes first 12 characters for brevity
 */
function generateShortId(): string {
  // Use crypto.randomUUID() for simple UUID generation
  // Available in Node.js 14.17+ and modern browsers
  try {
    return randomUUID().replace(/-/g, '').substring(0, 12);
  } catch {
    // Fallback: use randomBytes to generate UUID v4
    const bytes = randomBytes(16);
    
    // Set version (4) and variant bits according to RFC 4122
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10
    
    // Convert to hex string
    return bytes.toString('hex').substring(0, 12);
  }
}

/**
 * Generate unique trace ID
 * Format: trace_<uuid>
 * @returns Unique trace identifier
 */
export function generateTraceId(): string {
  return `trace_${generateShortId()}`;
}

/**
 * Generate unique connection ID
 * Format: conn_<uuid>
 * @returns Unique connection identifier
 */
export function generateConnectionId(): string {
  return `conn_${generateShortId()}`;
}

/**
 * Generate unique request ID
 * Format: req_<uuid>
 * @returns Unique request identifier
 */
export function generateRequestId(): string {
  return `req_${generateShortId()}`;
}

/**
 * Generate unique server ID
 * Format: <protocol>_server_<uuid>
 * @param protocol - The server protocol (e.g., 'http', 'grpc', 'ws')
 * @returns Unique server identifier
 */
export function generateServerId(protocol: string): string {
  return `${protocol}_server_${generateShortId()}`;
}