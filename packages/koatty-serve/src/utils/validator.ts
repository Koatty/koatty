/*
 * @Description: Configuration validator
 * @Usage: Validates server configuration at runtime
 * @Author: richen
 * @Date: 2025-10-12
 * @License: BSD (3-Clause)
 */

import { KoattyProtocol, ListeningOptions } from "../config/config";

/**
 * Validation error interface
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Configuration validator class
 */
export class ConfigValidator {
  private errors: ValidationError[] = [];

  /**
   * Validate server configuration
   * @param options Server listening options
   * @returns Validation result
   */
  validate(options: ListeningOptions): ValidationResult {
    this.errors = [];
    
    // Validate hostname
    this.validateHostname(options.hostname);
    
    // Validate port
    this.validatePort(options.port);
    
    // Validate protocol
    this.validateProtocol(options.protocol as KoattyProtocol);
    
    // Validate protocol-specific configuration
    if (['https', 'http2', 'wss'].includes(options.protocol)) {
      this.validateSSLConfig(options);
    }
    
    if (options.protocol === 'grpc') {
      this.validateGrpcConfig(options);
    }

    // Validate connection pool config if present
    if (options.connectionPool) {
      this.validateConnectionPoolConfig(options);
    }
    
    return {
      valid: this.errors.length === 0,
      errors: [...this.errors]
    };
  }

  /**
   * Validate hostname
   */
  private validateHostname(hostname: string): void {
    if (!hostname || typeof hostname !== 'string') {
      this.errors.push({
        field: 'hostname',
        message: 'Hostname must be a non-empty string',
        value: hostname
      });
      return;
    }
    
    // Validate hostname format (IP, domain, or localhost)
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    const isLocalhost = hostname === 'localhost' || hostname === '0.0.0.0';
    
    if (!isLocalhost && !ipRegex.test(hostname) && !domainRegex.test(hostname)) {
      this.errors.push({
        field: 'hostname',
        message: 'Invalid hostname format. Must be a valid IP address, domain name, or localhost',
        value: hostname
      });
    }

    // Validate IP address ranges
    if (ipRegex.test(hostname)) {
      const parts = hostname.split('.').map(Number);
      if (parts.some(part => part < 0 || part > 255)) {
        this.errors.push({
          field: 'hostname',
          message: 'Invalid IP address. Each octet must be between 0 and 255',
          value: hostname
        });
      }
    }
  }

  /**
   * Validate port number
   */
  private validatePort(port: number): void {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      this.errors.push({
        field: 'port',
        message: 'Port must be an integer between 1 and 65535',
        value: port
      });
      return;
    }
    
    // Check privileged ports (require root/admin privileges)
    if (port < 1024 && process.getuid && process.getuid() !== 0) {
      this.errors.push({
        field: 'port',
        message: 'Privileged ports (< 1024) require root/administrator privileges',
        value: port
      });
    }

    // Warn about commonly used ports
    const commonPorts: Record<number, string> = {
      22: 'SSH',
      25: 'SMTP',
      53: 'DNS',
      80: 'HTTP',
      110: 'POP3',
      143: 'IMAP',
      443: 'HTTPS',
      3306: 'MySQL',
      5432: 'PostgreSQL',
      6379: 'Redis',
      27017: 'MongoDB'
    };

    if (commonPorts[port]) {
      // This is just a warning, not an error
      // Could be logged but not added to errors
      this.errors.push({
        field: 'port',
        message: `Commonly used port: ${commonPorts[port]}`,
        value: port
      });
    }
  }

  /**
   * Validate protocol
   */
  private validateProtocol(_protocol: KoattyProtocol): void {
    // const validProtocols: KoattyProtocol[] = ['http', 'https', 'http2', 'grpc', 'ws', 'wss'];
    
    // if (!validProtocols.includes(protocol)) {
    //   // default to http
    //   protocol = 'http';
    // }
    return;
  }

  /**
   * Validate SSL configuration
   * Note: Empty strings are allowed as they may be populated from app.config later
   */
  private validateSSLConfig(options: ListeningOptions): void {
    const { ext } = options;
    
    if (!ext) {
      // ext object doesn't exist, which is a problem for secure protocols
      this.errors.push({
        field: 'ext',
        message: `SSL configuration (ext object) required for ${options.protocol} protocol`
      });
      return;
    }

    // ext.key and ext.cert can be empty strings if they will be populated later
    // Only validate if they are not strings
    if (ext.key !== undefined && typeof ext.key !== 'string') {
      this.errors.push({
        field: 'ext.key',
        message: `SSL key must be a string (file path or content)`,
        value: ext.key
      });
    }

    if (ext.cert !== undefined && typeof ext.cert !== 'string') {
      this.errors.push({
        field: 'ext.cert',
        message: `SSL certificate must be a string (file path or content)`,
        value: ext.cert
      });
    }
  }

  /**
   * Validate gRPC configuration
   * Note: Empty strings are allowed as they may be populated from app.config later
   */
  private validateGrpcConfig(options: ListeningOptions): void {
    const { ext } = options;
    
    if (!ext) {
      this.errors.push({
        field: 'ext',
        message: 'gRPC configuration (ext object) required for grpc protocol'
      });
      return;
    }

    // ext.protoFile can be an empty string if it will be populated later
    if (ext.protoFile !== undefined && typeof ext.protoFile !== 'string') {
      this.errors.push({
        field: 'ext.protoFile',
        message: 'Proto file path must be a string',
        value: ext.protoFile
      });
    }
  }

  /**
   * Validate connection pool configuration
   */
  private validateConnectionPoolConfig(options: ListeningOptions): void {
    const { connectionPool } = options;
    
    if (!connectionPool) return;

    if (connectionPool.maxConnections !== undefined) {
      if (!Number.isInteger(connectionPool.maxConnections) || connectionPool.maxConnections < 1) {
        this.errors.push({
          field: 'connectionPool.maxConnections',
          message: 'maxConnections must be a positive integer',
          value: connectionPool.maxConnections
        });
      }
    }

    if (connectionPool.connectionTimeout !== undefined) {
      if (!Number.isInteger(connectionPool.connectionTimeout) || connectionPool.connectionTimeout < 0) {
        this.errors.push({
          field: 'connectionPool.connectionTimeout',
          message: 'connectionTimeout must be a non-negative integer (milliseconds)',
          value: connectionPool.connectionTimeout
        });
      }
    }

    if (connectionPool.keepAliveTimeout !== undefined) {
      if (!Number.isInteger(connectionPool.keepAliveTimeout) || connectionPool.keepAliveTimeout < 0) {
        this.errors.push({
          field: 'connectionPool.keepAliveTimeout',
          message: 'keepAliveTimeout must be a non-negative integer (milliseconds)',
          value: connectionPool.keepAliveTimeout
        });
      }
    }

    if (connectionPool.requestTimeout !== undefined) {
      if (!Number.isInteger(connectionPool.requestTimeout) || connectionPool.requestTimeout < 0) {
        this.errors.push({
          field: 'connectionPool.requestTimeout',
          message: 'requestTimeout must be a non-negative integer (milliseconds)',
          value: connectionPool.requestTimeout
        });
      }
    }
  }

  /**
   * Format validation errors as a readable message
   */
  static formatErrors(errors: ValidationError[]): string {
    if (errors.length === 0) return '';
    
    const messages = errors.map(error => {
      let msg = `  • ${error.field}: ${error.message}`;
      if (error.value !== undefined) {
        msg += ` (received: ${JSON.stringify(error.value)})`;
      }
      return msg;
    });
    
    return `Configuration validation failed:\n${messages.join('\n')}`;
  }
}

/**
 * Quick validation function
 * @param options Server listening options
 * @throws Error if validation fails
 */
export function validateConfig(options: ListeningOptions): void {
  const validator = new ConfigValidator();
  const result = validator.validate(options);
  
  if (!result.valid) {
    throw new Error(ConfigValidator.formatErrors(result.errors));
  }
}

