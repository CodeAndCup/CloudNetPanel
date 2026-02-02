# 🚀 Quick Setup Guide - CloudNet Panel (After Security Remediation)

**IMPORTANT:** This guide is for setting up the CloudNet Panel after Phase 1 security improvements.

---

## ⚠️ BREAKING CHANGES

This version includes **breaking changes** that improve security:

1. **JWT_SECRET is now REQUIRED** - Server will not start without it
2. **CORS is now whitelisted** - Only specified origins can access the API
3. **Admin user is no longer hardcoded** - Must be created via wizard
4. **WebSocket authentication changed** - Token must be in protocol header

---

## 📋 Prerequisites

- Node.js 18+ 
- npm 8+
- SQLite 3
- (Optional) CloudNet server running

---

## 🔧 Setup Steps

### 1. Install Dependencies

```bash
# Root dependencies
npm install

# Server dependencies
cd server && npm install

# Client dependencies
cd ../client && npm install
```

### 2. Generate JWT Secret

**CRITICAL:** Generate a secure JWT secret (required for server to start):

```bash
# From project root
npm run generate-secret -- --save
```

This will:
- Generate a cryptographically secure 128-character secret
- Save it to `server/.env` automatically
- Display the secret for manual copying if needed

**Alternative (manual):**
```bash
npm run generate-secret
# Copy the output and add to server/.env:
# JWT_SECRET=<generated-secret-here>
```

### 3. Configure Environment

Edit `server/.env` and configure:

```bash
# Security (REQUIRED)
JWT_SECRET=<your-generated-secret>
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# JWT Token Expiry (optional, defaults shown)
JWT_ACCESS_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d

# Server (optional)
PORT=5000
NODE_ENV=development

# CloudNet API (if you have CloudNet server)
CLOUDNET_API_ENABLED=true
CLOUDNET_API_URL=http://127.0.0.1:2812/api/v3
CLOUDNET_API_USERNAME=administrator
CLOUDNET_API_PASSWORD=administrator
```

**⚠️ For production:**
```bash
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com
JWT_ACCESS_EXPIRY=1h
```

### 4. Create Admin User

Run the interactive wizard to create an administrator account:

```bash
cd server
npm run create-admin
```

Follow the prompts:
- **Username:** Min 3 chars, alphanumeric + hyphens/underscores
- **Email:** Valid email format
- **Password:** Min 8 chars, must include uppercase, lowercase, and number
- **Confirm Password:** Must match

Example:
```
Admin Username (min 3 chars, alphanumeric): admin
Admin Email: admin@localhost.local
Admin Password (min 8 chars, must include: uppercase, lowercase, number): Admin123!
Confirm Password: Admin123!

✅ Admin user created successfully!
```

### 5. Start the Application

**Development mode (separate servers):**
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

**Or use concurrently (both in one terminal):**
```bash
# From project root
npm run dev
```

**Production mode:**
```bash
# Build frontend
cd client
npm run build

# Start server (serves built frontend)
cd ../server
npm start
```

---

## ✅ Verification

### 1. Check Server Startup

You should see:
```
🔍 Running startup validation...

✅ All validation checks passed!

🚀 CloudNet Panel server running on port 5000
   Environment: development
   CloudNet API: ENABLED
   CloudNet URL: http://127.0.0.1:2812/api/v3

✅ Server ready at http://localhost:5000
```

### 2. Test Authentication

```bash
# Login with your admin credentials
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin123!"
  }'
```

Expected response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@localhost.local",
    "role": "Administrators"
  }
}
```

### 3. Test Protected Endpoint

```bash
# Use the token from login response
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <your-token-here>"
```

### 4. Access Frontend

Open browser: `http://localhost:3000` (or `http://localhost:5173` for Vite dev server)

Login with your admin credentials.

---

## 🔒 Security Notes

### JWT Tokens

**Access Token:**
- Expires in 1 hour (configurable via `JWT_ACCESS_EXPIRY`)
- Used for API authentication
- Include in `Authorization: Bearer <token>` header

**Refresh Token:**
- Expires in 7 days (configurable via `JWT_REFRESH_EXPIRY`)
- Used to get new access token when expired
- Send to `/api/auth/refresh` endpoint

**Token Refresh Example:**
```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<your-refresh-token>"}'
```

### WebSocket Authentication

**New format (secure):**

JavaScript:
```javascript
const token = 'your-jwt-token';
const ws = new WebSocket('ws://localhost:5000', [
  `authorization.bearer.${token}`
]);
```

React:
```javascript
const connectWebSocket = (token) => {
  const ws = new WebSocket(
    'ws://localhost:5000',
    [`authorization.bearer.${token}`]
  );
  
  ws.onopen = () => console.log('Connected');
  ws.onerror = (err) => console.error('WS Error:', err);
  ws.onclose = (event) => console.log('Closed:', event.code);
  
  return ws;
};
```

**❌ Old format (insecure, no longer works):**
```javascript
// DON'T USE THIS - Token visible in logs!
const ws = new WebSocket(`ws://localhost:5000?token=${token}`);
```

---

## 🐛 Troubleshooting

### Server Won't Start

**Error:** `JWT_SECRET is required`
- **Solution:** Run `npm run generate-secret -- --save`

**Error:** `Port 5000 is already in use`
- **Solution:** Change `PORT` in `server/.env` or kill process using port 5000

**Error:** `Database not accessible`
- **Solution:** Ensure `server/database` directory exists and is writable

### Login Fails

**Error:** `Invalid credentials`
- **Solution:** Verify username/password, recreate admin: `npm run create-admin`

**Error:** `Too many authentication attempts`
- **Solution:** Wait 15 minutes (rate limiting), or restart server to reset

### CORS Errors

**Error:** `Access-Control-Allow-Origin` in browser console
- **Solution:** Add your frontend URL to `ALLOWED_ORIGINS` in `server/.env`
- Example: `ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173`

### WebSocket Connection Fails

**Error:** `Authentication failed` on WebSocket
- **Solution:** Update client code to use new protocol header format (see above)

**Error:** `Policy Violation (1008)`
- **Solution:** Token is invalid or expired, get new token via login

---

## 📊 Health Check

**Endpoint:** `GET /api/health`

```bash
curl http://localhost:5000/api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-02T18:00:00.000Z",
  "version": "1.0.0"
}
```

---

## 🔄 Rate Limiting

**Authentication endpoints:**
- **Limit:** 5 attempts per 15 minutes
- **Applies to:** `/api/auth/login`

**General endpoints:**
- **Limit:** 100 requests per minute
- **Applies to:** All other endpoints

**When limited:**
- Status: 429 (Too Many Requests)
- Response:
  ```json
  {
    "success": false,
    "error": {
      "code": "AUTH_RATE_LIMIT_EXCEEDED",
      "message": "Too many authentication attempts. Please try again in 15 minutes."
    }
  }
  ```

---

## 📖 Next Steps

1. **Read Documentation:**
   - `PROGRESS.md` - Implementation progress
   - `SESSION_SUMMARY.md` - What was changed
   - `.claude/00_LIRE_DABORD.md` - Original audit

2. **Update Frontend:**
   - WebSocket authentication (use protocol header)
   - JWT refresh token handling
   - CORS configuration
   - Error handling for new response format

3. **Configure for Production:**
   - Set `NODE_ENV=production`
   - Use proper ALLOWED_ORIGINS
   - Configure HTTPS (Phase 2)
   - Set up monitoring (Phase 4)

4. **Testing:**
   - Test authentication flow
   - Test WebSocket connections
   - Test rate limiting
   - Test error handling

---

## 🆘 Support

**Issues?**
1. Check `PROGRESS.md` for known issues
2. Review `SESSION_SUMMARY.md` for breaking changes
3. Verify `.env` configuration
4. Check server logs for detailed errors

**Scripts Available:**
- `npm run dev` - Start in development mode
- `npm run generate-secret` - Generate JWT secret
- `npm run create-admin` - Create admin user
- `cd server && npm start` - Start server in production

---

## ✅ Success Checklist

- [ ] Dependencies installed
- [ ] JWT_SECRET generated and in `.env`
- [ ] ALLOWED_ORIGINS configured
- [ ] Admin user created
- [ ] Server starts without errors
- [ ] Can login via API
- [ ] Can access protected endpoints
- [ ] Frontend loads and connects
- [ ] WebSocket authentication works

---

**🎉 You're all set!** The CloudNet Panel is now running with enhanced security.

**Security Score:** 7.5/10 (from 6.5/10)  
**Phase 1 Progress:** 86% Complete  
**Next:** Complete Phase 1 and move to Infrastructure (Phase 2)

