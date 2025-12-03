# File Upload S3 Integration

Next.js 16 프론트엔드 데모 프로젝트로, Kotlin/Spring Boot 백엔드 API(whale-erp-api)와 AWS S3 스토리지를 활용한 파일 업로드 기능을 제공합니다.

## Tech Stack

- **Framework**: Next.js 16.0.7
- **React**: 19.2.0
- **Styling**: Tailwind CSS 4
- **Language**: TypeScript 5
- **Linting**: ESLint 9

## 시작하기

### 사전 요구사항

- Node.js 18+
- 백엔드 API 서버 실행 중 (`http://localhost:8080`)

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 시작 (http://localhost:3000)
npm run dev

# 프로덕션 빌드
npm run build

# ESLint 실행
npm run lint
```

## 아키텍처

### 백엔드 통합

이 프론트엔드는 `http://localhost:8080`의 백엔드 API와 연동됩니다:

| API | 엔드포인트 | 설명 |
|-----|-----------|------|
| File API | `/api/v1/files` | 파일 업로드, 목록 조회, 다운로드, 삭제 |
| Auth API | `/api/auth/login` | JWT 인증 (admin/admin123 자동 로그인) |

### 파일 타입 시스템

두 가지 업로드 타입으로 구분된 접근 패턴을 제공합니다:

| 타입 | 접근 방식 | 설명 |
|------|----------|------|
| **IMAGE** | Public | `publicUrl`로 직접 접근, S3에 public-read ACL로 저장 |
| **ATTACHMENT** | Private | 만료 시간이 있는 Pre-signed URL로 보안 다운로드 |

### 카테고리

카테고리는 S3 저장 경로를 결정합니다:

**이미지 카테고리**
- `STORE_IMAGE` - 매장 이미지
- `MENU_IMAGE` - 메뉴 이미지
- `ORGANIZATION_LOGO_EXPANDED` - 조직 로고 (확장)
- `ORGANIZATION_LOGO_COLLAPSED` - 조직 로고 (축소)
- `ETC_IMAGE` - 기타 이미지

**첨부파일 카테고리**
- `STORE_RENT_CONTRACT` - 매장 임대 계약서
- `BUSINESS_REGISTRATION` - 사업자 등록증
- `BUSINESS_LICENSE` - 영업 허가증
- `STORE_FLOOR_PLAN` - 매장 평면도
- `ETC_ATTACHMENT` - 기타 첨부파일

### 참조 타입

다형성 연관을 위한 참조 타입:
- `STORE` - 매장
- `MENU` - 메뉴
- `ORGANIZATION` - 조직
- `MEMBER` - 회원

## 프로젝트 구조

```
src/
├── app/
│   ├── layout.tsx              # 루트 레이아웃
│   ├── page.tsx                # 홈 페이지
│   └── file-upload/
│       └── page.tsx            # 파일 업로드 데모 페이지
├── components/
│   └── file-upload/
│       ├── FileUpload.tsx      # 드래그 앤 드롭 업로드 컴포넌트
│       ├── FileList.tsx        # 파일 목록 그리드 컴포넌트
│       └── FileItem.tsx        # 개별 파일 카드 컴포넌트
├── lib/
│   └── api/
│       ├── fileUpload.ts       # 파일 API 클라이언트
│       └── auth.ts             # 인증 서비스 (싱글톤)
└── types/
    └── file-upload.ts          # TypeScript 타입 정의
```

## 주요 컴포넌트

### FileUpload

드래그 앤 드롭과 클릭 선택을 지원하는 파일 업로드 컴포넌트입니다.

```tsx
<FileUpload
  referenceType="STORE"
  referenceId={1}
  category="STORE_IMAGE"
  onUploadSuccess={() => refetchFiles()}
  label="이미지 업로드"
  accept="image/*"
/>
```

**Props**
| Prop | 타입 | 설명 |
|------|------|------|
| `referenceType` | `ReferenceType` | 참조 타입 |
| `referenceId` | `number` | 참조 ID |
| `category` | `UploadFileCategory` | 업로드 카테고리 |
| `onUploadSuccess` | `() => void` | 업로드 성공 콜백 |
| `label` | `string` | 표시 라벨 (선택) |
| `accept` | `string` | 허용 파일 타입 (선택) |

### FileList

파일 목록을 그리드 형태로 표시하며, 로딩 스켈레톤과 빈 상태를 지원합니다.

```tsx
<FileList
  files={files}
  isLoading={isLoading}
  onDelete={(fileId) => handleDelete(fileId)}
/>
```

### FileItem

개별 파일 카드로 미리보기, 다운로드, 삭제 기능을 제공합니다.
- 이미지 파일: 썸네일 미리보기
- 첨부 파일: 아이콘 표시
- Pre-signed URL을 통한 보안 다운로드

## API 클라이언트

`fileUploadApi` 객체로 모든 파일 작업을 수행합니다:

```typescript
import { fileUploadApi } from '@/lib/api/fileUpload';

// 이미지 업로드
await fileUploadApi.uploadImage(file, category, referenceType, referenceId);

// 첨부파일 업로드
await fileUploadApi.uploadAttachment(file, category, referenceType, referenceId);

// 파일 목록 조회
await fileUploadApi.getFilesByReference(referenceType, referenceId);

// 다운로드 URL 생성 (Pre-signed URL)
await fileUploadApi.getDownloadUrl(fileId, expirationMinutes);

// 파일 삭제
await fileUploadApi.deleteFile(fileId);
```

## 인증

`authService`는 싱글톤 패턴으로 구현되어 자동 로그인과 토큰 캐싱을 제공합니다:

- 첫 API 호출 시 자동으로 로그인 수행
- JWT 토큰을 메모리에 캐싱
- 모든 API 요청에 Bearer 토큰 자동 첨부

## Path Alias

`@/*` → `./src/*` 매핑이 tsconfig.json에 설정되어 있습니다.

```typescript
// 사용 예시
import { fileUploadApi } from '@/lib/api/fileUpload';
import { UploadFileResponse } from '@/types/file-upload';
```

## 데모 페이지

`/file-upload` 경로에서 파일 업로드 기능을 테스트할 수 있습니다:

1. Reference Type과 ID 선택
2. 이미지/첨부파일 탭 전환
3. 카테고리 선택 후 파일 업로드
4. 업로드된 파일 목록 확인 및 관리
