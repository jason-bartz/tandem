# Apple Sign In Credentials Setup Guide

This guide explains how to obtain and configure the Apple Sign In credentials required for account deletion token revocation.

## Required Credentials

You need four values to enable Apple Sign In REST API for account deletion:

1. **APPLE_TEAM_ID** - Your Apple Developer Team ID
2. **APPLE_CLIENT_ID** - Your app's bundle identifier
3. **APPLE_KEY_ID** - Sign in with Apple key identifier
4. **APPLE_PRIVATE_KEY** - Base64-encoded private key

---

## Step-by-Step Setup

### 1. Get Your Team ID

1. Go to [Apple Developer](https://developer.apple.com/account)
2. Sign in with your Apple ID
3. Click **Membership** in the left sidebar
4. Your **Team ID** is displayed (format: ABC1234567)
5. Copy this value

**Example**: `67U8F4P2C5`

---

### 2. Get Your Client ID (Bundle ID)

Your client ID is your app's bundle identifier, which you've already configured.

**For Tandem**: `com.tandemdaily.app`

---

### 3. Create Sign in with Apple Key

1. Go to [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/authkeys/list)
2. Click the **+** button to create a new key
3. Enter a **Key Name** (e.g., "Sign in with Apple - Account Deletion")
4. Check **Sign in with Apple**
5. Click **Configure** next to Sign in with Apple
6. Select your app's App ID (com.tandemdaily.app)
7. Click **Save**
8. Click **Continue**
9. Click **Register**
10. **IMPORTANT**: Download the key file (`.p8`) immediately - you cannot download it again!
11. Note the **Key ID** (format: ABC123DEFG)

**Example Key ID**: `67U8F4P2C5`

---

### 4. Encode the Private Key

The private key file you downloaded is named something like `AuthKey_ABC123DEFG.p8`.

You need to base64-encode this file:

#### On macOS/Linux:

```bash
base64 -i AuthKey_ABC123DEFG.p8 > apple_private_key.txt
```

Then copy the contents of `apple_private_key.txt` (it will be one long string).

#### On Windows (PowerShell):

```powershell
[Convert]::ToBase64String([System.IO.File]::ReadAllBytes("AuthKey_ABC123DEFG.p8")) > apple_private_key.txt
```

**Result**: You should have a long base64 string like:

```
LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JR0hBZ0VBTUJNR0J5cUdTTTQ5QWdF...
```

---

## Add to Environment Variables

### Local Development (.env.local)

Create or update your `.env.local` file in the project root:

```bash
# Apple Sign In REST API Configuration
APPLE_TEAM_ID=ABC1234567
APPLE_CLIENT_ID=com.tandemdaily.app
APPLE_KEY_ID=ABC123DEFG
APPLE_PRIVATE_KEY=LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0t...
```

**Important**:

- Replace the values with your actual credentials
- Keep the private key as a single line (no line breaks)
- Do NOT commit `.env.local` to git (it's in `.gitignore`)

---

### Production (Vercel)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your Tandem project
3. Go to **Settings** → **Environment Variables**
4. Add each variable:

| Name                | Value               | Environments        |
| ------------------- | ------------------- | ------------------- |
| `APPLE_TEAM_ID`     | Your Team ID        | Production, Preview |
| `APPLE_CLIENT_ID`   | com.tandemdaily.app | Production, Preview |
| `APPLE_KEY_ID`      | Your Key ID         | Production, Preview |
| `APPLE_PRIVATE_KEY` | Your base64 key     | Production, Preview |

5. Click **Save** after adding each one
6. Redeploy your app for changes to take effect

---

## Verify Configuration

### 1. Check Environment Variables

Create a test API route or add to an existing one:

```javascript
// src/app/api/test-apple-config/route.js
import { NextResponse } from 'next/server';

export async function GET() {
  const hasTeamId = !!process.env.APPLE_TEAM_ID;
  const hasClientId = !!process.env.APPLE_CLIENT_ID;
  const hasKeyId = !!process.env.APPLE_KEY_ID;
  const hasPrivateKey = !!process.env.APPLE_PRIVATE_KEY;

  return NextResponse.json({
    configured: hasTeamId && hasClientId && hasKeyId && hasPrivateKey,
    details: {
      APPLE_TEAM_ID: hasTeamId ? 'Set' : 'Missing',
      APPLE_CLIENT_ID: hasClientId ? 'Set' : 'Missing',
      APPLE_KEY_ID: hasKeyId ? 'Set' : 'Missing',
      APPLE_PRIVATE_KEY: hasPrivateKey ? 'Set' : 'Missing',
    },
  });
}
```

Visit `/api/test-apple-config` and verify all are "Set".

### 2. Test Client Secret Generation

In your browser console or API testing tool:

```javascript
// Test endpoint
fetch('/api/test-apple-auth', {
  method: 'POST',
})
  .then((r) => r.json())
  .then(console.log);
```

Create the test endpoint:

```javascript
// src/app/api/test-apple-auth/route.js
import { NextResponse } from 'next/server';
import { generateAppleClientSecret } from '@/lib/apple-auth';

export async function POST() {
  try {
    const clientSecret = generateAppleClientSecret();
    return NextResponse.json({
      success: true,
      message: 'Client secret generated successfully',
      length: clientSecret.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
```

Expected response:

```json
{
  "success": true,
  "message": "Client secret generated successfully",
  "length": 500+ (approximate)
}
```

---

## Security Best Practices

### ✅ DO:

- Store private key in environment variables
- Use base64 encoding for the private key
- Rotate keys periodically (every 6-12 months)
- Use different keys for development and production (recommended)
- Keep the `.p8` file in a secure location (password manager)

### ❌ DON'T:

- Commit private keys to git
- Share keys in Slack/email/chat
- Store keys in client-side code
- Use the same key across multiple apps
- Share keys between team members (each should have their own)

---

## Troubleshooting

### Error: "Missing required Apple Sign In credentials"

**Cause**: Environment variables not set or not loaded.

**Solution**:

1. Verify `.env.local` exists in project root
2. Check variable names match exactly (case-sensitive)
3. Restart your dev server (`npm run dev`)
4. For Vercel, redeploy after adding variables

### Error: "Invalid private key format"

**Cause**: Private key not properly base64-encoded or contains line breaks.

**Solution**:

1. Re-encode the `.p8` file using the commands above
2. Ensure the base64 string is on a single line (no `\n` characters)
3. Verify you're encoding the correct `.p8` file

### Error: "Token generation failed"

**Cause**: Private key doesn't match the Key ID or Team ID.

**Solution**:

1. Verify Team ID is correct (check Apple Developer portal)
2. Verify Key ID matches the key file name
3. Re-download the private key if needed (you'll need to create a new one)
4. Check that the key has "Sign in with Apple" enabled

### Error: "Authorization code exchange failed"

**Cause**: Authorization code expired (5-minute limit) or already used.

**Solution**:

- Authorization codes can only be used once
- They expire after 5 minutes
- This is normal for older sessions
- Account deletion will continue even if exchange fails

---

## Key File Security Checklist

- [ ] Private key stored in environment variables
- [ ] Original `.p8` file stored in secure location (password manager)
- [ ] `.env.local` added to `.gitignore`
- [ ] No keys committed to git (check with `git log -p | grep "APPLE_PRIVATE_KEY"`)
- [ ] Production keys different from development (recommended)
- [ ] Key rotation schedule established (6-12 months)
- [ ] Team members have their own keys (not shared)

---

## Key Rotation

When rotating keys (recommended every 6-12 months):

1. Create a new key in Apple Developer portal (follow Step 3 above)
2. Base64-encode the new key
3. Update environment variables with new values
4. Keep the old key active for 24-48 hours (for in-flight requests)
5. Revoke the old key in Apple Developer portal
6. Delete the old key from environment variables
7. Securely delete the old `.p8` file

---

## Additional Resources

- [Apple Sign in with Apple Documentation](https://developer.apple.com/documentation/sign_in_with_apple)
- [Generating Client Secrets](https://developer.apple.com/documentation/sign_in_with_apple/generate_and_validate_tokens)
- [Revoking Tokens](https://developer.apple.com/documentation/sign_in_with_apple/revoke_tokens)
- [Apple Developer Portal](https://developer.apple.com/account)

---

**Last Updated**: October 31, 2025
**Maintained By**: Good Vibes Games Development Team
