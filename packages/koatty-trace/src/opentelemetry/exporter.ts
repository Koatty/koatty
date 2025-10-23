/**
 * 
 * @Description: 
 * @Author: richen
 * @Date: 2025-04-04 12:21:48
 * @LastEditTime: 2025-04-04 19:11:05
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ExportResult, ExportResultCode } from '@opentelemetry/core';
import { DefaultLogger as Logger } from 'koatty_logger';

/**
 * A trace exporter with retry mechanism and circuit breaker pattern for OpenTelemetry.
 * Extends the base OTLPTraceExporter with additional reliability features.
 * 
 * Features:
 * - Configurable retry attempts for failed exports
 * - Circuit breaker pattern to prevent cascading failures
 * - Exponential backoff delay between retries
 * 
 * @extends OTLPTraceExporter
 * 
 * @param {Object} config - Configuration object
 * @param {number} [config.maxRetries=3] - Maximum number of retry attempts
 * @param {number} [config.retryDelay=1000] - Base delay between retries in milliseconds
 * @param {number} [config.failureThreshold=5] - Number of failures before circuit opens
 * @param {number} [config.resetTimeout=30000] - Time in milliseconds before attempting to close circuit
 */
export class RetryOTLPTraceExporter extends OTLPTraceExporter {
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  
  private failureCount = 0;
  private lastFailureTime = 0;
  private circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(config: any) {
    super(config);
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.failureThreshold = config.failureThreshold || 5;
    this.resetTimeout = config.resetTimeout || 30000;
  }

  async export(spans: any, resultCallback: (result: ExportResult) => void) {
    // Check circuit breaker state
    if (this.circuitState === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime > this.resetTimeout) {
        this.circuitState = 'HALF_OPEN';
      } else {
        resultCallback({
          code: ExportResultCode.FAILED,
          error: new Error('Circuit breaker is open - skipping export')
        });
        return;
      }
    }

    let lastError: Error;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await super.export(spans, resultCallback);
        
        // Reset circuit if successful in HALF_OPEN state
        if (this.circuitState === 'HALF_OPEN') {
          this.resetCircuit();
        }
        return result;
      } catch (error) {
        lastError = error;
        
        // Update failure count and check threshold
        this.failureCount++;
        if (this.failureCount >= this.failureThreshold) {
          this.tripCircuit();
        }

        if (attempt < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }

    resultCallback({code: ExportResultCode.FAILED, error: lastError});
  }

  private tripCircuit() {
    this.circuitState = 'OPEN';
    this.lastFailureTime = Date.now();
    this.failureCount = 0;
    Logger.warn('Circuit breaker tripped - stopping exports temporarily');
  }

  private resetCircuit() {
    this.circuitState = 'CLOSED';
    this.failureCount = 0;
    Logger.info('Circuit breaker reset - exports resumed');
  }
}
