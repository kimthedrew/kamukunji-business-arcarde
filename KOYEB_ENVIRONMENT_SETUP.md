# Koyeb Environment Variables Setup

## 🚨 Current Issue
The application is failing to start because Supabase environment variables are missing:
```
Error: Missing Supabase environment variables
```

## ✅ Solution: Set Environment Variables in Koyeb

### Step 1: Access Koyeb Dashboard
1. Go to [Koyeb Dashboard](https://app.koyeb.com)
2. Navigate to your KBA application
3. Click on your service/instance

### Step 2: Add Environment Variables
Go to **Settings** → **Environment Variables** and add these variables:

#### Required Environment Variables:

```bash
# Server Configuration
PORT=5000
NODE_ENV=production

# JWT Secret (generate a strong secret for production)
JWT_SECRET=your-super-secret-jwt-key-here

# Supabase Configuration
SUPABASE_PROJECT_URL=https://tfqhvegztkqvudnntwca.supabase.co
SUPABASE_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmcWh2ZWd6dGtxdnVkbm50d2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTcyNjEsImV4cCI6MjA3NzEzMzI2MX0.0sfpFaIE-7cnDQ654hf5n7zpBmijF4LNgIarK8rkPZ0

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=dqs267r6d
CLOUDINARY_API_KEY=685853637123388
CLOUDINARY_API_SECRET=kBHBKyMIEDOw4WcokxX_81Xhz7Y

# VAPID Keys for Push Notifications
VAPID_PUBLIC_KEY=BO4es6mRS5IrVpmHIwzZx9po7ud7xsKl9pXydyF5eGreIGCKhfMqQypuZD_XVM6X6oFB07Uia8W2Yy2yg5zIS30
VAPID_PRIVATE_KEY=MWTDYJGMLN_wns4b0vi1Z-wuJ6qGEDKgHndysAlOT5s
VAPID_SUBJECT=mailto:kimutai3002@gmail.com

# Admin Configuration
ADMIN_EMAIL=admin@kba.com
ADMIN_PASSWORD=your-admin-password

# CORS Configuration (update with your Koyeb domain)
CORS_ORIGIN=https://your-app-name.koyeb.app
```

### Step 3: Important Notes

#### 🔐 Security Considerations:
- **JWT_SECRET**: Generate a strong, unique secret key for production
- **ADMIN_PASSWORD**: Set a strong password for admin access
- **CORS_ORIGIN**: Update with your actual Koyeb domain

#### 🌐 CORS Configuration:
Replace `https://your-app-name.koyeb.app` with your actual Koyeb domain:
- Your domain will be: `https://[your-app-name].koyeb.app`
- Check your Koyeb dashboard for the exact domain

#### 🔑 Generate New JWT Secret:
```bash
# Generate a strong JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 4: Deploy After Setting Variables
1. After adding all environment variables
2. Click **Deploy** or **Redeploy** in Koyeb
3. The application should start successfully

### Step 5: Verify Deployment
1. Check the **Logs** tab for any errors
2. Visit your Koyeb domain to test the application
3. Test the health endpoint: `https://your-app.koyeb.app/api/health`

## 🚨 Common Issues

### Issue 1: Still Getting "Missing Supabase environment variables"
- **Solution**: Double-check that `SUPABASE_PROJECT_URL` and `SUPABASE_API_KEY` are set correctly
- **Note**: No spaces around the `=` sign in environment variables

### Issue 2: CORS Errors
- **Solution**: Update `CORS_ORIGIN` with your actual Koyeb domain
- **Format**: `https://your-app-name.koyeb.app` (no trailing slash)

### Issue 3: Database Connection Issues
- **Solution**: Verify Supabase credentials are correct
- **Check**: Supabase project is active and accessible

## 📋 Environment Variables Checklist

- [ ] `PORT=5000`
- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` (strong secret key)
- [ ] `SUPABASE_PROJECT_URL` (your Supabase URL)
- [ ] `SUPABASE_API_KEY` (your Supabase API key)
- [ ] `CLOUDINARY_CLOUD_NAME` (your Cloudinary cloud name)
- [ ] `CLOUDINARY_API_KEY` (your Cloudinary API key)
- [ ] `CLOUDINARY_API_SECRET` (your Cloudinary API secret)
- [ ] `VAPID_PUBLIC_KEY` (for push notifications)
- [ ] `VAPID_PRIVATE_KEY` (for push notifications)
- [ ] `VAPID_SUBJECT` (your email)
- [ ] `ADMIN_EMAIL` (admin email)
- [ ] `ADMIN_PASSWORD` (strong admin password)
- [ ] `CORS_ORIGIN` (your Koyeb domain)

## 🎯 Next Steps After Setup

1. **Set all environment variables** in Koyeb dashboard
2. **Redeploy** the application
3. **Test the application** at your Koyeb domain
4. **Check logs** for any remaining issues
5. **Update CORS_ORIGIN** with your actual domain

## 📞 Support

If you continue to have issues:
1. Check the **Logs** tab in Koyeb for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure your Supabase project is active
4. Contact Koyeb support if needed
