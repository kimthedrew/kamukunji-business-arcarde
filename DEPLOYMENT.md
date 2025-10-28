# KBA Deployment Checklist

## Pre-Deployment Setup

### 1. Environment Variables
- [ ] Copy `.env.example` to `.env`
- [ ] Fill in all required environment variables:
  - [ ] `JWT_SECRET` - Generate a strong secret key
  - [ ] `SUPABASE_PROJECT_URL` - Your Supabase project URL
  - [ ] `SUPABASE_API_KEY` - Your Supabase API key
  - [ ] `CLOUDINARY_CLOUD_NAME` - Your Cloudinary cloud name
  - [ ] `CLOUDINARY_API_KEY` - Your Cloudinary API key
  - [ ] `CLOUDINARY_API_SECRET` - Your Cloudinary API secret
  - [ ] `VAPID_PUBLIC_KEY` - Generate with `npx web-push generate-vapid-keys`
  - [ ] `VAPID_PRIVATE_KEY` - Generate with `npx web-push generate-vapid-keys`
  - [ ] `VAPID_SUBJECT` - Your email for VAPID keys

### 2. Database Setup
- [ ] Create Supabase project
- [ ] Run SQL schema from `server/supabase-schema.sql`
- [ ] Test database connection
- [ ] Seed initial data if needed

### 3. Cloudinary Setup
- [ ] Create Cloudinary account
- [ ] Get API credentials
- [ ] Test image upload functionality

## GitHub Deployment

### 1. Repository Setup
- [ ] Initialize Git repository: `git init`
- [ ] Add all files: `git add .`
- [ ] Commit changes: `git commit -m "Initial commit"`
- [ ] Create GitHub repository
- [ ] Add remote origin: `git remote add origin <your-repo-url>`
- [ ] Push to GitHub: `git push -u origin main`

### 2. Verify Files
- [ ] `Dockerfile` - Multi-stage build configuration
- [ ] `docker-compose.yml` - Local development setup
- [ ] `koyeb.yaml` - Koyeb deployment configuration
- [ ] `.env.example` - Environment variables template
- [ ] `.gitignore` - Excludes sensitive files
- [ ] `deploy.sh` - Deployment script
- [ ] `README.md` - Project documentation

## Koyeb Deployment

### 1. Koyeb Setup
- [ ] Create Koyeb account
- [ ] Connect GitHub repository
- [ ] Select deployment method: Dockerfile

### 2. Environment Variables in Koyeb
- [ ] Set all environment variables in Koyeb dashboard
- [ ] Use production values (not development)
- [ ] Verify all variables are set correctly

### 3. Deployment Configuration
- [ ] Use `koyeb.yaml` configuration
- [ ] Set region (recommended: fra - Frankfurt)
- [ ] Set instance type (nano for testing, micro for production)
- [ ] Configure scaling (min: 1, max: 3)

### 4. Deploy
- [ ] Start deployment
- [ ] Monitor build logs
- [ ] Check health endpoint: `https://your-app.koyeb.app/api/health`
- [ ] Test main functionality

## Post-Deployment Testing

### 1. Health Checks
- [ ] Health endpoint responds: `GET /api/health`
- [ ] Server uptime is tracked
- [ ] No critical errors in logs

### 2. Core Functionality
- [ ] Shop registration works
- [ ] Shop login works
- [ ] Product search works
- [ ] Order placement works
- [ ] Admin login works
- [ ] Image upload works
- [ ] Notifications work

### 3. Performance
- [ ] Page load times are acceptable
- [ ] Image loading is optimized
- [ ] Database queries are efficient
- [ ] No memory leaks

## Monitoring & Maintenance

### 1. Logs
- [ ] Monitor application logs
- [ ] Set up error alerts
- [ ] Track performance metrics

### 2. Database
- [ ] Monitor database performance
- [ ] Set up backup schedules
- [ ] Monitor storage usage

### 3. Security
- [ ] Regular security updates
- [ ] Monitor for vulnerabilities
- [ ] Review access logs

## Troubleshooting

### Common Issues
1. **Build fails**: Check Dockerfile and dependencies
2. **Environment variables**: Verify all are set in Koyeb
3. **Database connection**: Check Supabase credentials
4. **Image upload**: Verify Cloudinary configuration
5. **CORS issues**: Check CORS_ORIGIN setting

### Useful Commands
```bash
# Test production build locally
npm run build
npm run start:prod

# Test Docker build
docker build -t kba-app .
docker run -p 5000:5000 kba-app

# Check health endpoint
curl https://your-app.koyeb.app/api/health
```

## Support
- Check Koyeb documentation for deployment issues
- Review application logs in Koyeb dashboard
- Test locally with production environment variables
