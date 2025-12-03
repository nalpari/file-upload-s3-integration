# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next.js 16 frontend demo for file upload functionality integrated with a Kotlin/Spring Boot backend API (whale-erp-api) using AWS S3 storage.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

## Architecture

### Backend Integration

This frontend connects to a backend API at `http://localhost:8080`:

- **File API**: `/api/v1/files` - Upload, list, download, delete files
- **Auth API**: `/api/auth/login` - JWT authentication (auto-login with admin/admin123)

### File Type System

Two upload types with different access patterns:

- **IMAGE** (public): Direct access via `publicUrl`, stored in S3 with public-read ACL
- **ATTACHMENT** (private): Pre-signed URLs with expiration for secure downloads

Categories determine S3 paths:

- Image: `STORE_IMAGE`, `MENU_IMAGE`, `ORGANIZATION_LOGO_*`, `ETC_IMAGE`
- Attachment: `STORE_RENT_CONTRACT`, `BUSINESS_REGISTRATION`, `BUSINESS_LICENSE`, `STORE_FLOOR_PLAN`, `ETC_ATTACHMENT`

Reference types for polymorphic association: `STORE`, `MENU`, `ORGANIZATION`, `MEMBER`

### Key Files

- `src/lib/api/fileUpload.ts` - API client for all file operations
- `src/lib/api/auth.ts` - Singleton auth service with auto-login and token caching
- `src/types/file-upload.ts` - TypeScript types matching backend DTOs
- `src/components/file-upload/` - Reusable upload components (FileUpload, FileList, FileItem)

### Path Alias

Uses `@/*` mapping to `./src/*` (configured in tsconfig.json).

## Memo

- 모든 답변과 추론과정은 한국어로 작성한다.
