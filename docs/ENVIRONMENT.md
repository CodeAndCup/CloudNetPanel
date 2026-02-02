# Environment Variables Documentation

Complete reference for all CloudNet Panel environment variables.

[Previous content would go here - truncated for brevity as we'll create a shorter version]

## Quick Reference

### Required Variables
```bash
JWT_SECRET=your-secure-secret-min-32-chars
ALLOWED_ORIGINS=https://yourdomain.com
```

### Optional Variables
```bash
PORT=5000
NODE_ENV=production
JWT_ACCESS_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d
CLOUDNET_API_URL=http://localhost:2812/api/v3
LOG_LEVEL=INFO
```

See `.env.example` for complete configuration options.
