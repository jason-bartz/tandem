# Security Documentation

## Overview
This document outlines the security measures implemented for the Tandem admin backend.

## Implemented Security Features

### 1. Rate Limiting & Brute Force Protection
- **Authentication Rate Limiting**: Maximum 5 login attempts per 15 minutes
- **Account Lockout**: Automatic lockout after 5 failed attempts
  - First lockout: 30 minutes
  - Second lockout: 30 minutes  
  - Third lockout: 24 hours (permanent block)
- **API Rate Limiting**:
  - Auth endpoints: 5 requests per minute
  - General read operations: 30 requests per minute
  - Write operations: 10 requests per minute

### 2. Input Validation & Sanitization
- **Zod Schema Validation**: All inputs validated with strict schemas
- **XSS Prevention**: HTML entity escaping for user inputs
- **Request Size Limits**: Maximum 100KB request body size
- **Pattern Matching**: Strict regex patterns for usernames, dates, and answers
- **SQL Injection Prevention**: Parameterized queries (though using KV store)

### 3. Security Headers
- **X-Frame-Options**: SAMEORIGIN (prevents clickjacking)
- **X-Content-Type-Options**: nosniff (prevents MIME sniffing)
- **X-XSS-Protection**: 1; mode=block (XSS protection)
- **Referrer-Policy**: strict-origin-when-cross-origin
- **Content-Security-Policy**: Restrictive CSP for admin routes
- **Permissions-Policy**: Disables camera, microphone, geolocation

### 4. CORS Configuration
- **Admin Routes**: Restricted to specific origins
- **Public Routes**: Open CORS for game API
- **Credentials**: Only allowed for admin routes from trusted origins

## Configuration

### Environment Variables
```bash
# Required for production
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD_HASH=bcrypt_hashed_password
JWT_SECRET=your_secure_jwt_secret
```

### Generate Secure Credentials

1. **Generate JWT Secret**:
```bash
node scripts/generate-jwt-secret.js
```

2. **Hash Admin Password**:
```bash
node scripts/hash-password.js your-secure-password
```

## Security Best Practices

### For Development
- Use `.env.local` for environment variables
- Never commit sensitive data to version control
- Use different credentials than production

### For Production
1. **Environment Variables**:
   - Use secure environment variable management (Vercel, AWS Secrets, etc.)
   - Never use default values in production
   - Rotate secrets regularly

2. **Monitoring**:
   - Monitor failed login attempts
   - Set up alerts for suspicious activity
   - Review access logs regularly

3. **Updates**:
   - Keep dependencies updated
   - Review security advisories
   - Perform regular security audits

## Rate Limiting Details

### How It Works
1. **Client Identification**: Uses IP address from headers (x-forwarded-for, x-real-ip, cf-connecting-ip)
2. **Redis/KV Storage**: Tracks attempts in Vercel KV with automatic expiration
3. **Progressive Lockouts**: Increases lockout duration with repeated violations

### Response Headers
Rate limited responses include:
- `Retry-After`: Seconds until rate limit resets
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Reset`: Timestamp when limit resets

## Error Handling

### Sanitized Error Messages
- Production: Generic error messages to prevent information leakage
- Development: Detailed error messages for debugging

### Status Codes
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (missing/invalid token)
- `413`: Payload Too Large (request size exceeded)
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error

## Testing Security

### Manual Testing
1. **Test Rate Limiting**:
```bash
# Test auth rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/admin/auth \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"wrong"}'
done
```

2. **Test Input Validation**:
```bash
# Test XSS prevention
curl -X POST http://localhost:3000/api/admin/puzzles \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date":"2024-01-01","puzzle":{"theme":"<script>alert(1)</script>","puzzles":[...]}}'
```

3. **Test Request Size Limit**:
```bash
# Create large payload
dd if=/dev/zero bs=1024 count=150 | base64 > large.txt
curl -X POST http://localhost:3000/api/admin/auth \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"test\",\"password\":\"$(cat large.txt)\"}"
```

## Incident Response

If a security incident occurs:
1. **Immediate Actions**:
   - Rotate all secrets (JWT_SECRET, passwords)
   - Review access logs
   - Identify compromised accounts

2. **Investigation**:
   - Check rate limiting logs
   - Review failed authentication attempts
   - Analyze request patterns

3. **Remediation**:
   - Patch vulnerabilities
   - Update security measures
   - Document lessons learned

## Future Enhancements

Consider implementing:
- [ ] Two-Factor Authentication (2FA)
- [ ] IP Whitelisting for admin access
- [ ] Session management with refresh tokens
- [ ] Audit logging system
- [ ] Web Application Firewall (WAF)
- [ ] Security scanning in CI/CD pipeline

## Contact

For security concerns or vulnerability reports, please contact the development team immediately.