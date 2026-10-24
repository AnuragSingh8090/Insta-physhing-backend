# Backend API

Node.js + Express REST API.

## Setup

```bash
npm install
cp .env.example .env
```

## Run

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

## API Endpoints

| Method | Route         | Description          |
|--------|---------------|----------------------|
| GET    | /api/health   | Health / connectivity check |

### Example Response — `GET /api/health`

```json
{
  "success": true,
  "message": "API is up and running",
  "data": {
    "environment": "development",
    "timestamp": "2026-10-19T12:00:00.000Z",
    "uptime": "10s"
  }
}
```

## Folder Structure

```
src/
├── app.js              # Express app setup (middleware, routes)
├── server.js           # Entry point — starts HTTP server
├── config/
│   └── index.js        # Environment config
├── controllers/
│   └── health.controller.js
├── middlewares/
│   ├── errorHandler.js
│   └── notFound.js
├── routes/
│   ├── index.js        # Root router
│   └── health.routes.js
└── utils/
    └── response.js     # Reusable response helpers
```
