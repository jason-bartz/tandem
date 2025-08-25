# Vercel Environment Variables Setup Guide

## 🔐 Your Production Credentials

### Admin Credentials
- **Username:** `delta_overseer_8688`
- **Password:** `TAQr(9o6[%1@|CcDY|?*?y_P` (⚠️ SAVE THIS IN A PASSWORD MANAGER!)
- **Password Hash:** `$2a$10$Quy8brZcpASpL0aFd7.IPeL0Y96RLEA9VyU96FjwqiRF3pE/B6YtS`

### JWT Secret for Production
```
H2NcmpDOQ4cwJzOzeqUKLrQ4vBmvxF/lxydaQ8dqd/g7MrifuP49d8IrLP49AVmgsx+PrNxsQpemjfWK/xoXeQ==
```

## 📋 Step-by-Step Vercel Setup

### 1. Access Vercel Dashboard
1. Go to [vercel.com](https://vercel.com) and log in
2. Select your `Tandem` project
3. Navigate to **Settings** → **Environment Variables**

### 2. Add Production Environment Variables

Click "Add New" for each variable and set:

#### Required Security Variables:

| Key | Value | Environment |
|-----|-------|-------------|
| `ADMIN_USERNAME` | `delta_overseer_8688` | Production |
| `ADMIN_PASSWORD_HASH` | `$2a$10$Quy8brZcpASpL0aFd7.IPeL0Y96RLEA9VyU96FjwqiRF3pE/B6YtS` | Production |
| `JWT_SECRET` | `H2NcmpDOQ4cwJzOzeqUKLrQ4vBmvxF/lxydaQ8dqd/g7MrifuP49d8IrLP49AVmgsx+PrNxsQpemjfWK/xoXeQ==` | Production |

#### App Configuration Variables:

| Key | Value | Environment |
|-----|-------|-------------|
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.vercel.app` | Production |
| `NEXT_PUBLIC_GAME_START_DATE` | `2025-01-01` | Production |
| `NEXT_PUBLIC_ENABLE_SOUNDS` | `true` | Production |
| `NEXT_PUBLIC_ENABLE_SHARING` | `true` | Production |
| `NEXT_PUBLIC_ENABLE_STATS` | `true` | Production |

### 3. Environment Selection
For each variable, select which environments it should be available in:
- ✅ **Production** - For live site
- ⬜ **Preview** - Optional, for preview deployments
- ⬜ **Development** - Not needed (using .env.local)

### 4. Sensitive Variable Settings
For security variables (`ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `JWT_SECRET`):
- ✅ Check "Sensitive" to hide values in the dashboard
- This prevents team members from viewing the actual values

### 5. Redeploy After Adding Variables
1. After adding all variables, go to **Deployments**
2. Find your latest deployment
3. Click the three dots menu → **Redeploy**
4. Select "Use existing Build Cache" → **Redeploy**

## 🔄 Alternative: Using Vercel CLI

If you prefer command line:

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Add environment variables
vercel env add ADMIN_USERNAME production
# Enter: delta_overseer_8688

vercel env add ADMIN_PASSWORD_HASH production
# Enter: $2a$10$Quy8brZcpASpL0aFd7.IPeL0Y96RLEA9VyU96FjwqiRF3pE/B6YtS

vercel env add JWT_SECRET production
# Enter: H2NcmpDOQ4cwJzOzeqUKLrQ4vBmvxF/lxydaQ8dqd/g7MrifuP49d8IrLP49AVmgsx+PrNxsQpemjfWK/xoXeQ==

# Redeploy
vercel --prod
```

## 🛡️ Security Best Practices

### DO:
- ✅ Store this document in a secure location (password manager)
- ✅ Use different credentials for development and production
- ✅ Enable "Sensitive" flag for security variables in Vercel
- ✅ Rotate credentials periodically (every 3-6 months)
- ✅ Use Vercel's audit logs to track changes

### DON'T:
- ❌ Share credentials via email or chat
- ❌ Commit credentials to Git
- ❌ Use the same password for multiple services
- ❌ Leave default values in production
- ❌ Store credentials in plain text files

## 🔍 Verification

After deployment, verify your setup:

1. **Test Login**:
   - Go to `https://your-domain.vercel.app/admin/login`
   - Username: `delta_overseer_8688`
   - Password: `TAQr(9o6[%1@|CcDY|?*?y_P`

2. **Check Security Headers**:
   ```bash
   curl -I https://your-domain.vercel.app/admin
   # Should show X-Frame-Options, CSP, etc.
   ```

3. **Test Rate Limiting**:
   - Try multiple failed login attempts
   - Should lock after 5 attempts

## 🚨 Emergency Procedures

### If Credentials Are Compromised:
1. **Immediately** change environment variables in Vercel
2. Generate new JWT secret: `node scripts/generate-jwt-secret.js`
3. Generate new password: `node scripts/generate-secure-password.js`
4. Hash new password: `node scripts/hash-password.js "new-password"`
5. Update Vercel environment variables
6. Redeploy the application
7. Review access logs for unauthorized access

### Backup Access Method:
Keep a secure backup of:
- This document
- Original passwords (in password manager)
- Vercel account recovery options

## 📞 Support

If you need help:
1. Vercel Documentation: https://vercel.com/docs/environment-variables
2. Vercel Support: https://vercel.com/support
3. Security issues: Contact development team immediately

---

**Last Updated:** December 2024
**Next Review:** March 2025