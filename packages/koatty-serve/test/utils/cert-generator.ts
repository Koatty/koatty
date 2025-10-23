// test/utils/cert-generator.ts - 生成用于测试的自签名SSL证书
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * 为测试生成自签名SSL证书
 */
export function generateTestCertificates() {
  const tempDir = path.join(__dirname, '../temp');
  const keyFile = path.join(tempDir, 'test-key.pem');
  const certFile = path.join(tempDir, 'test-cert.pem');

  // 如果证书已存在,跳过生成
  if (fs.existsSync(keyFile) && fs.existsSync(certFile)) {
    return { keyFile, certFile };
  }

  // 创建temp目录
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  try {
    // 使用 OpenSSL 生成自签名证书
    // 注意: 这需要系统安装了 openssl
    const command = `openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' ` +
      `-keyout "${keyFile}" -out "${certFile}" -days 365 2>/dev/null`;
    
    execSync(command, { stdio: 'ignore' });
    
    console.log('✓ Test SSL certificates generated successfully');
    return { keyFile, certFile };
  } catch (error) {
    // 如果 OpenSSL 不可用,创建虚拟证书文件用于测试
    console.warn('⚠ OpenSSL not available, creating dummy certificates for testing');
    
    // 创建虚拟的私钥
    const dummyKey = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7VJTUt9Us8cKj
MzEfYyjiWA4R4/M2bS1+fWIcPm15A8nOW3TvkJ4lNeZT0g9VUJ9vKmUIFJPDwT/A
kVjInW6WKMaJqJLlK8Nn0PjTqKQvTqN2pF5aQg0nBvmUbLQ3pq8W1bMvvvYfnJjJ
qgcN3gqkHM9nw0Dq0lJNVE4LPbR1pprTQQ7jRs5T6wRq0jRLiHlW3LAR3c2uTaOP
xKzfELRxG3tGMKcPNO9FJFt0dTPIvXSjm9A0dHXp9VfWNwSZ9VJxVKcGWLh5fKdL
yGXQ4dVLxFJdwG8fDIeALXvDUpQQiuJwWJnJOYK5WJ5tOPJLqJvGEF2hpmJ+xYrZ
lh1pU7I1AgMBAAECggEAARhT7qvLHCj1FJ3gHXzMzQNKQSqYTNKYJsVGKJmxHcHc
KWsJGvFcZhjLmMxHW5XQD5TYmF3/fLvHMQrwWUGvO2HjBNvXQPVvVLdUyPCrjvT+
WPaH7TQhFdFaVPDvXgJt3kqJLxVQ0GDJhYOvP6yLqGmNLjPQrU9OkYvBxYLTNvWo
aQzB7JLyQ8xYVPCj3YGE2rjF+wHPJ5dFXL8CjELvFYP1kGxpQDGDjKqYGP1iMJPP
qiKkHNOqvLgGFUqjBYV3G0n9bQvIqPHN6JGl8JYWJpwMN5fLhYEYJ9WRxYLFXqNQ
VYPKGPJvRWQPsrqFqLJvYVPV8MdJKG0F5rQF5qkNAQKBgQDn0gIvH9kWZvVHc7aG
qYPyGvFXXYP1EM0L0GxYFJ5bXqWGNWMQJLJXdYbJqEXQiHDLqVPKLrQFYPVJLqLW
VkGqLVqrLGMVYPVJqLVYPVJLqLWVkGqLVqrLGMVYPVJqLVYPVJLqLWVkGqLVqrLG
MVYPVJ==
-----END PRIVATE KEY-----`;

    // 创建虚拟的证书
    const dummyCert = `-----BEGIN CERTIFICATE-----
MIIDazCCAlOgAwIBAgIUJEmvLp6ZBbLK0WnPBNXx5nAUFqYwDQYJKoZIhvcNAQEL
BQAwRTELMAkGA1UEBhMCQVUxEzARBgNVBAgMClNvbWUtU3RhdGUxITAfBgNVBAoM
GEludGVybmV0IFdpZGdpdHMgUHR5IEx0ZDAeFw0yMzAxMDEwMDAwMDBaFw0yNDAx
MDEwMDAwMDBaMEUxCzAJBgNVBAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEw
HwYDVQQKDBhJbnRlcm5ldCBXaWRnaXRzIFB0eSBMdGQwggEiMA0GCSqGSIb3DQEB
AQUAA4IBDwAwggEKAoIBAQC7VJTUt9Us8cKjMzEfYyjiWA4R4/M2bS1+fWIcPm15
A8nOW3TvkJ4lNeZT0g9VUJ9vKmUIFJPDwT/AkVjInW6WKMaJqJLlK8Nn0PjTqKQv
TqN2pF5aQg0nBvmUbLQ3pq8W1bMvvvYfnJjJqgcN3gqkHM9nw0Dq0lJNVE4LPbR1
pprTQQ7jRs5T6wRq0jRLiHlW3LAR3c2uTaOPxKzfELRxG3tGMKcPNO9FJFt0dTPI
vXSjm9A0dHXp9VfWNwSZ9VJxVKcGWLh5fKdLyGXQ4dVLxFJdwG8fDIeALXvDUpQQ
iuJwWJnJOYK5WJ5tOPJLqJvGEF2hpmJ+xYrZlh1pU7I1AgMBAAGjUzBRMB0GA1Ud
DgQWBBSE3c0L+0TLKLBqJNVdXZTqXGKfmzAfBgNVHSMEGDAWgBSE3c0L+0TLKLBq
JNVdXZTqXGKfmzAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQBt
pM0gLJN9E5l6Y8dZ9Vr+dZqDRQYVqLqY3LqJvGEF2hpmJ+xYrZlh1pU7I1qLVYPV
JLqLWVkGqLVqrLGMVYPVJqLVYPVJLqLWVkGqLVqrLGMVYPVJqLVYPVJLqLWVkGqL
VqrLGMVYPV==
-----END CERTIFICATE-----`;

    fs.writeFileSync(keyFile, dummyKey);
    fs.writeFileSync(certFile, dummyCert);
    
    console.log('✓ Dummy certificates created for testing');
    return { keyFile, certFile };
  }
}

/**
 * 清理测试证书
 */
export function cleanupTestCertificates() {
  const tempDir = path.join(__dirname, '../temp');
  if (fs.existsSync(tempDir)) {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log('✓ Test certificates cleaned up');
    } catch (error) {
      console.warn('⚠ Failed to cleanup test certificates:', error);
    }
  }
}

