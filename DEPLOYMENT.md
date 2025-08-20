# 🚀 Tandem Deployment Guide

Your Tandem game is now ready for deployment! Follow these steps to go live.

## ✅ Completed Steps
- ✅ Code organized into professional Next.js structure
- ✅ Dependencies installed and build tested
- ✅ Build errors fixed
- ✅ Git repository initialized
- ✅ Code pushed to GitHub: https://github.com/jason-bartz/tandem.git

## 📋 Next Steps: Deploy to Vercel

### 1. Deploy with Vercel (Recommended - Easiest)

1. **Go to Vercel**: https://vercel.com
2. **Sign in** with your GitHub account
3. **Click "Add New Project"**
4. **Import your repository**: Select `jason-bartz/tandem`
5. **Configure Project**:
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: `./` (leave as is)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

### 2. Environment Variables (IMPORTANT!)

In Vercel, add these environment variables:

```env
# Required for Admin Panel
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=[GENERATE WITH: npm run hash-password YOUR_PASSWORD]
JWT_SECRET=your-very-long-random-secret-key-change-this

# App Configuration
NEXT_PUBLIC_APP_URL=https://YOUR-APP.vercel.app
NEXT_PUBLIC_GAME_START_DATE=2025-01-01

# Feature Flags
NEXT_PUBLIC_ENABLE_SOUNDS=true
NEXT_PUBLIC_ENABLE_SHARING=true
NEXT_PUBLIC_ENABLE_STATS=true
```

### 3. Generate Admin Password Hash

Run this locally to generate your password hash:
```bash
cd /Users/jasonbartz/Documents/Development\ Projects/Tandem
npm run hash-password YOUR_SECURE_PASSWORD
```

Copy the output hash and use it for `ADMIN_PASSWORD_HASH` in Vercel.

### 4. Optional: Vercel KV Database (for persistent data)

1. In Vercel Dashboard, go to **Storage** tab
2. Click **Create Database** → **KV**
3. Name it (e.g., "tandem-kv")
4. Vercel will automatically add the KV environment variables

Without KV, the app will use in-memory storage (data resets on redeploy).

### 5. Deploy

Click **Deploy** and wait for the build to complete (usually 1-2 minutes).

## 🌐 Custom Domain (Optional)

1. In Vercel project settings → **Domains**
2. Add your custom domain (e.g., tandem.game)
3. Follow DNS configuration instructions

## 🎮 Access Your Game

Once deployed:
- **Game**: https://YOUR-APP.vercel.app
- **Admin Panel**: https://YOUR-APP.vercel.app/admin
- **Admin Login**: Use the credentials you configured

## 📱 Test the PWA

1. Open the site on mobile
2. You should see an "Install" or "Add to Home Screen" prompt
3. The game works offline after first visit

## 🔧 Post-Deployment

### Update Code
```bash
# Make changes locally
git add .
git commit -m "Your changes"
git push

# Vercel auto-deploys from GitHub
```

### Monitor Performance
- Check Vercel Analytics tab
- View build logs in Vercel Dashboard
- Monitor API usage in Functions tab

## 🆘 Troubleshooting

### Build Fails
- Check build logs in Vercel
- Ensure all environment variables are set
- Try `npm run build` locally

### Admin Login Not Working
- Verify ADMIN_PASSWORD_HASH is set correctly
- Check JWT_SECRET is configured
- Ensure you're using the right username/password

### PWA Not Installing
- Must be served over HTTPS (Vercel handles this)
- Check manifest file at `/site.webmanifest`
- Clear browser cache and try again

## 📊 Next Features to Add

1. **Analytics**: Add Vercel Analytics or Google Analytics
2. **Database**: Set up Vercel KV for persistent storage
3. **Monitoring**: Add error tracking (Sentry)
4. **CDN**: Images are already optimized via Next.js

## 🎉 Success Checklist

- [ ] Site loads at Vercel URL
- [ ] Game is playable
- [ ] Admin panel accessible at /admin
- [ ] Can create/edit puzzles in admin
- [ ] PWA installs on mobile
- [ ] Dark mode works
- [ ] Sound effects play

---

**Congratulations!** Your Tandem game is now live! 🎊

For support or issues, check the [GitHub repository](https://github.com/jason-bartz/tandem).