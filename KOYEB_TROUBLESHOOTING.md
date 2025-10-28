# Koyeb Deployment Troubleshooting

## Current Issue: Missing index.html

### Error Message:
```
Could not find a required file.
  Name: index.html
  Searched in: /workspace/client/public
```

### Possible Causes:

1. **Public folder not copied properly** during Docker build
2. **Working directory mismatch** in Koyeb environment
3. **Build context issues** with file copying
4. **Caching issues** with previous failed builds

### Solutions to Try:

#### 1. Use Alternative Dockerfile
If the main Dockerfile fails, try using `Dockerfile.koyeb`:
- Rename `Dockerfile.koyeb` to `Dockerfile`
- This uses explicit file copying instead of copying the entire client directory

#### 2. Clear Build Cache
In Koyeb dashboard:
- Go to your service
- Click "Settings" → "Build"
- Enable "Clear build cache"
- Redeploy

#### 3. Check Build Logs
Look for these specific lines in the build logs:
- `COPY client/ ./` - Should copy all client files
- `ls -la public/` - Should show public folder contents
- `test -f public/index.html` - Should verify index.html exists

#### 4. Verify File Structure
The client directory should contain:
```
client/
├── public/
│   ├── index.html
│   ├── favicon.ico
│   └── ...
├── src/
├── package.json
└── ...
```

#### 5. Manual Verification
If the issue persists, you can add debug commands to the Dockerfile:

```dockerfile
# Add this after copying client files
RUN find . -name "index.html" -type f
RUN ls -la public/
RUN pwd
```

### Alternative Build Strategy

If the issue continues, try this approach:

1. **Pre-build the React app locally:**
   ```bash
   cd client
   npm install
   npm run build
   cd ..
   ```

2. **Copy the built files directly:**
   ```dockerfile
   # In Dockerfile, replace the client build stage with:
   COPY client/build ./public
   ```

### Environment Variables Check

Ensure these are set in Koyeb:
- `NODE_ENV=production`
- All required environment variables from `.env.example`

### Contact Support

If none of these solutions work:
1. Check Koyeb documentation for React app deployment
2. Contact Koyeb support with the build logs
3. Consider using a different deployment platform (Vercel, Netlify, Railway)

### Quick Fix Commands

```bash
# Test build locally
docker build -t kba-test .

# Test with alternative Dockerfile
docker build -f Dockerfile.koyeb -t kba-test2 .

# Verify client structure
ls -la client/public/
```
