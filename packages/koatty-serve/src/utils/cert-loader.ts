/*
 * @Description: Unified certificate loader utility
 * @Usage: Load SSL/TLS certificates from file paths or direct content
 * @Author: richen
 * @Date: 2025-01-14
 * @LastEditTime: 2025-01-14
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

import { readFileSync, existsSync } from 'fs';
import { createLogger } from './logger';

const logger = createLogger({ module: 'cert-loader' });

/**
 * 检测字符串是否为证书内容
 * 
 * @param input - 待检测的字符串
 * @returns 是否为证书内容
 */
export function isCertificateContent(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }
  
  // 检查是否包含 PEM 格式的标记
  const pemMarkers = [
    '-----BEGIN CERTIFICATE-----',
    '-----BEGIN PRIVATE KEY-----',
    '-----BEGIN RSA PRIVATE KEY-----',
    '-----BEGIN EC PRIVATE KEY-----',
    '-----BEGIN ENCRYPTED PRIVATE KEY-----',
    '-----BEGIN PUBLIC KEY-----'
  ];
  
  return pemMarkers.some(marker => input.includes(marker));
}

/**
 * 加载证书
 * 
 * 支持两种输入方式:
 * 1. 文件路径: 读取文件内容
 * 2. 证书内容: 直接返回
 * 
 * @param keyOrPath - 证书文件路径或证书内容
 * @param type - 证书类型描述 (用于错误信息)
 * @param traceId - 追踪ID (可选)
 * @returns 证书内容字符串
 */
export function loadCertificate(keyOrPath: string, type: string, traceId?: string): string {
  if (!keyOrPath) {
    throw new Error(`${type} path or content is required`);
  }

  try {
    // 判断是否是证书内容
    if (isCertificateContent(keyOrPath)) {
      logger.debug(`Using ${type} from direct content`, { traceId });
      return keyOrPath;
    }
    
    // 判断是文件路径
    if (!existsSync(keyOrPath)) {
      throw new Error(`${type} file not found: ${keyOrPath}`);
    }
    
    const content = readFileSync(keyOrPath, 'utf8');
    logger.debug(`Loaded ${type} from file`, { traceId, path: keyOrPath });
    
    // 验证加载的内容是否是有效的证书
    if (!isCertificateContent(content)) {
      logger.warn(`${type} file content does not appear to be a valid certificate`, {
        traceId,
        path: keyOrPath
      });
    }
    
    return content;
    
  } catch (error) {
    logger.error(`Failed to load ${type}`, { traceId }, { path: keyOrPath, error });
    throw new Error(`Failed to load ${type}: ${(error as Error).message}`);
  }
}

/**
 * 证书配置接口
 */
export interface CertificateConfig {
  key?: string;
  cert?: string;
  ca?: string;
}

/**
 * 加载后的证书
 */
export interface LoadedCertificates {
  key?: string;
  cert?: string;
  ca?: string;
}

/**
 * 批量加载证书配置
 * 
 * @param config - 证书配置
 * @param traceId - 追踪ID (可选)
 * @returns 加载后的证书内容
 */
export function loadCertificates(
  config: CertificateConfig,
  traceId?: string
): LoadedCertificates {
  const loaded: LoadedCertificates = {};

  if (config.key) {
    loaded.key = loadCertificate(config.key, 'private key', traceId);
  }

  if (config.cert) {
    loaded.cert = loadCertificate(config.cert, 'certificate', traceId);
  }

  if (config.ca) {
    loaded.ca = loadCertificate(config.ca, 'CA certificate', traceId);
  }

  return loaded;
}

