# File Sharing System

A full-stack file sharing application with secure upload, storage, and sharing via time-limited public links.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [API Reference](#api-reference)
- [Design Decisions](#design-decisions)
- [Assumptions & Trade-offs](#assumptions--trade-offs)

---

## Tech Stack

| Layer        | Technology                                        |
| ------------ | ------------------------------------------------- |
| Backend      | NestJS 11, TypeScript, TypeORM 0.3, PostgreSQL    |
| File Storage | AWS S3 (SDK v3)                                   |
| Auth         | JWT in HTTP-only cookie, Passport.js              |
| Frontend     | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| Logging      | Winston via nest-winston                          |

---

## Project Structure

```
file-sharing-system/
├── file-sharing-server/   # NestJS backend (port 3001)
│   └── src/
│       ├── auth/          # JWT auth (register, login, logout, me)
│       ├── files/         # File upload, list, get, delete, share
│       ├── users/         # User entity & repository
│       └── constants/     # App-wide constants & limits
└── file-sharing-client/   # Next.js frontend (port 3000)
    ├── app/               # App Router pages
    └── components/        # Navbar, FileUpload, FileList
```

---

## Setup & Installation

### Prerequisites

- Node.js >= 18
- PostgreSQL running locally (or a remote instance)
- AWS account with an S3 bucket and IAM credentials

### 1. Clone the repository

```bash
git clone https://github.com/faizan123456/file-sharing-system.git
cd file-sharing-system
```

### 2. Backend setup

```bash
cd file-sharing-server
npm install
cp .env.example .env
# Fill in .env with your values (see Environment Variables below)
```

### 3. Frontend setup

```bash
cd ../file-sharing-client
npm install
# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
```

---

## Environment Variables

### Backend (`file-sharing-server/.env`)

```env
# Application
PORT=3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=file_sharing

# AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=your-bucket-name

# JWT
JWT_SECRET=your_strong_secret_here
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000
```

### Frontend (`file-sharing-client/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Running the Application

### Backend (development)

```bash
cd file-sharing-server
npm run start:dev
# Server starts at http://localhost:3001
```

### Backend (production)

```bash
npm run build
npm run start:prod
```

### Frontend (development)

```bash
cd file-sharing-client
npm run dev
# App starts at http://localhost:3000
```

### Frontend (production)

```bash
npm run build
npm start
```

> **Note:** The database schema is auto-created via TypeORM `synchronize: true` on first run. No manual migrations are needed for development.

---

## API Reference

All responses follow this format:

```json
{
  "success": true | false,
  "message": "...",
  "data": { ... } | null,
  "statusCode": 200
}
```

### Authentication

All auth routes are prefixed with `/auth`.

#### `POST /auth/register`

Register a new user.

**Request body:**

```json
{ "username": "alice", "email": "alice@example.com", "password": "secret123" }
```

**Response `201`:**

```json
{
  "success": true,
  "message": "Registration successful",
  "data": { "id": "uuid", "username": "alice", "email": "alice@example.com" }
}
```

---

#### `POST /auth/login`

Authenticate and receive a JWT cookie.

**Request body:**

```json
{ "email": "alice@example.com", "password": "secret123" }
```

**Response `200`:** Sets `access_token` HTTP-only cookie (7-day expiry).

---

#### `POST /auth/logout`

Clears the auth cookie.

**Response `200`:** Clears `access_token` cookie.

---

#### `GET /auth/me`

Returns the current authenticated user (JWT payload). Requires auth cookie.

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "user": {
      "userId": "uuid",
      "username": "alice",
      "email": "alice@example.com"
    }
  }
}
```

---

### Files

All file routes require a valid `access_token` cookie (except `GET /share/:publicId`).

#### `POST /upload`

Upload a file.

- **Content-Type:** `multipart/form-data`
- **Field `file`:** The file to upload (required). Max 5 MB. Allowed types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `application/pdf`, `text/plain`, `application/zip`, and common Office formats.
- **Field `expiryTime`:** ISO 8601 datetime string (optional). If set, the share link expires at this time.

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "originalName": "report.pdf",
    "size": 204800,
    "mimeType": "application/pdf",
    "url": "https://s3.amazonaws.com/...",
    "publicId": "abc123...",
    "uploadedAt": "2026-01-01T00:00:00.000Z",
    "expiryTime": null
  }
}
```

**Error responses:**

- `400` — No file provided, empty file, or unsupported file type
- `413` — File exceeds 5 MB limit

---

#### `GET /files`

List all files uploaded by the authenticated user (paginated).

**Query params:**
| Param | Default | Description |
|--------|---------|--------------------------|
| `page` | `1` | Page number (min 1) |
| `limit`| `10` | Items per page (max 100) |

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "list": [ { ...file } ],
    "total": 42,
    "page": 1,
    "limit": 10
  }
}
```

---

#### `GET /files/:id`

Get a single file by its UUID. Only the owner can access it.

**Response `200`:** File object. `403` if not the owner.

---

#### `DELETE /files/:id`

Delete a file (removes from S3 and database). Only the owner can delete.

**Response `200`:** `{ "success": true, "data": null }`. `403` if not the owner.

---

#### `GET /share/:publicId`

Retrieve a signed download URL for a publicly shared file. No authentication required.

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "url": "https://s3.amazonaws.com/...?X-Amz-Signature=...",
    "file": { "originalName": "report.pdf", "size": 204800, ... }
  }
}
```

**Error responses:**

- `404` — File not found
- `410` — Share link has expired

---

## Design Decisions

### PostgreSQL as the database

PostgreSQL was chosen over alternatives (MongoDB, MySQL) for its strong ACID guarantees and native UUID support (`uuid_generate_v4`). File metadata (name, size, MIME type, owner, expiry) maps naturally to a relational schema. TypeORM's `synchronize: true` removes migration overhead in development.

### JWT stored in an HTTP-only cookie

Storing the JWT in an HTTP-only, `SameSite: Strict` cookie prevents JavaScript-based XSS attacks from stealing the token — a significant improvement over `localStorage`. The cookie is scoped to the API origin and sent automatically with every request using `credentials: 'include'`.

### AWS S3 for file storage

Files are stored in S3 rather than on the local filesystem to keep the API server stateless and horizontally scalable. The `s3Key` (internal storage path) is stored in the database but never returned to API clients — it is excluded from all serialized responses using `@Exclude()` (class-transformer). Download access is provided exclusively through short-lived pre-signed URLs (1-hour expiry), which enforce access control at the S3 layer without proxying file bytes through the API server.

### `publicId` for shareable links

Each file is assigned a `publicId` generated with `crypto.randomBytes(16).toString('hex')` (32 hex characters) at upload time. This makes share links unpredictable and unguessable while keeping them short enough for a URL. The share endpoint requires no authentication, enabling easy link sharing without exposing authenticated user routes.

### File expiry

An optional `expiryTime` (ISO 8601) can be set per file at upload time. Expiry is enforced server-side: when a share link is accessed after its `expiryTime`, the API returns `410 Gone`. Expiry does not automatically delete the file from S3 — the user must explicitly delete files when they no longer need them.

### Allowed file types

The MIME type whitelist (images, PDF, plain text, ZIP, common Office formats) is enforced in the multer `fileFilter` before the file reaches the controller. This prevents storing arbitrary executables or unknown binary formats.

---

## Assumptions & Trade-offs

| Area                      | Decision                                                      | Trade-off                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **DB schema sync**        | `synchronize: true` in development                            | Convenient for development; must be disabled in production and replaced with migrations                                                      |
| **File expiry cleanup**   | Expired files remain in S3 until manually deleted             | No background job to prune S3; keeps the system simple but requires manual cleanup or a future cron job                                      |
| **Pre-signed URL expiry** | Share-page signed URLs expire in 1 hour                       | Users must refresh the share page to get a new URL after 1 hour; a longer TTL would reduce friction but increase the window for link leakage |
| **No file versioning**    | Each upload creates a new record                              | Simplifies the data model; no history or overwrite support                                                                                   |
| **Auth token lifespan**   | JWT expires in 7 days                                         | Longer session for convenience; refresh tokens not implemented to keep the scope manageable                                                  |
| **CORS**                  | Configured for a single origin via `CORS_ORIGIN` env var      | Multi-origin setups require updating the env var; no wildcard allowed since `credentials: true` requires explicit origin                     |
| **TypeORM synchronize**   | Only `User` and `File` entities are registered in `AppModule` | Adding new entities requires explicitly registering them in the `entities` array                                                             |
| **File size limit**       | Hard-capped at 5 MB via multer config                         | Chosen as a sensible default for a sharing demo; the constant lives in `app.constants.ts` for easy adjustment                                |
