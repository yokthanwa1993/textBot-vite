# LIFF Frontend - Message Editor

Simple LIFF frontend for message editing with OCR support.

## Setup

1. Copy environment variables:
```bash
cp .env.example .env
```

2. Edit `.env` file with your configuration:
```bash
# LIFF Configuration
VITE_LIFF_ID=your-liff-id-here

# GraphQL API Endpoints
VITE_GRAPHQL_URL_DEV=https://your-dev-api.com/graphql
VITE_GRAPHQL_URL_PROD=https://your-prod-api.com/graphql

# Server Configuration
VITE_SERVER_PORT=3000
VITE_FETCH_TIMEOUT=3000

# Allowed Hosts (comma separated)
VITE_ALLOWED_HOSTS=your-domain.com,localhost,127.0.0.1
```

3. Install dependencies:
```bash
npm install
```

4. Run development server:
```bash
npm run dev
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_LIFF_ID` | LINE LIFF Application ID | Required |
| `VITE_GRAPHQL_URL_DEV` | Development GraphQL endpoint | Required |
| `VITE_GRAPHQL_URL_PROD` | Production GraphQL endpoint | Required |

| `VITE_SERVER_PORT` | Development server port | 3000 |
| `VITE_FETCH_TIMEOUT` | API request timeout (ms) | 3000 |
| `VITE_ALLOWED_HOSTS` | Comma-separated allowed hosts | localhost,127.0.0.1 |

## Features

- LIFF integration with LINE
- GraphQL API communication
- OCR text editing support
- Message editing and saving
- Session management
- Responsive design

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build