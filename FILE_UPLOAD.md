# 파일 업로드 기능 (File Upload)

## 목차

1. [개요](#1-개요)
2. [아키텍처](#2-아키텍처)
3. [API 명세](#3-api-명세)
4. [데이터 모델](#4-데이터-모델)
5. [파일 분류 체계](#5-파일-분류-체계)
6. [S3 통합](#6-s3-통합)
7. [보안 고려사항](#7-보안-고려사항)
8. [사용 예시](#8-사용-예시)
9. [테스트 가이드](#9-테스트-가이드)

---

## 1. 개요

### 1.1 목적

whale-erp-api의 파일 업로드 기능은 다양한 도메인 엔티티(점포, 메뉴, 조직, 회원)에 연결된 파일을 AWS S3에 저장하고 관리합니다.

### 1.2 주요 특징

| 특징 | 설명 |
|------|------|
| **Polymorphic Association** | 하나의 파일 테이블로 여러 엔티티와 연결 |
| **이중 파일 타입** | 이미지(공개) / 첨부파일(비공개) 분리 관리 |
| **S3 통합** | AWS S3 기반 파일 저장 |
| **Pre-signed URL** | 비공개 파일의 안전한 다운로드 |
| **소프트 삭제** | 파일 복구 가능한 삭제 방식 |

### 1.3 기술 스택

- **Storage**: AWS S3
- **AWS SDK**: AWS SDK for Java v2
- **ORM**: JPA + QueryDSL
- **Framework**: Spring Boot 3.5.6
- **Language**: Kotlin 1.9.25

---

## 2. 아키텍처

### 2.1 패키지 구조

```
domain/uploadfile/
├── controller/
│   └── FileController.kt          # REST API 엔드포인트
├── dto/
│   ├── UploadFileRequest.kt       # 요청 DTO
│   └── UploadFileResponse.kt      # 응답 DTO
├── entity/
│   └── UploadFile.kt              # JPA 엔티티
├── enums/
│   ├── ReferenceType.kt           # 연결 엔티티 타입
│   ├── UploadFileCategory.kt      # 파일 카테고리
│   └── UploadFileType.kt          # 파일 타입 (IMAGE/ATTACHMENT)
├── repository/
│   ├── UploadFileRepository.kt          # JPA Repository
│   ├── UploadFileRepositoryCustom.kt    # QueryDSL 인터페이스
│   └── UploadFileRepositoryCustomImpl.kt # QueryDSL 구현체
└── service/
    ├── FileUploadService.kt       # 비즈니스 로직
    └── S3StorageService.kt        # S3 연동 서비스
```

### 2.2 레이어 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Frontend)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     FileController                           │
│  - POST /api/v1/files/attachments  (첨부파일 업로드)         │
│  - POST /api/v1/files/images       (이미지 업로드)           │
│  - GET  /api/v1/files/{id}         (파일 조회)               │
│  - GET  /api/v1/files/{id}/download-url (다운로드 URL)       │
│  - GET  /api/v1/files              (목록 조회)               │
│  - DELETE /api/v1/files/{id}       (삭제)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   FileUploadService                          │
│  - 파일 카테고리 검증                                        │
│  - 메타데이터 저장                                           │
│  - 비즈니스 로직 처리                                        │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│   UploadFileRepository  │     │    S3StorageService     │
│   (JPA + QueryDSL)      │     │    (AWS SDK v2)         │
└─────────────────────────┘     └─────────────────────────┘
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│      PostgreSQL         │     │        AWS S3           │
│    (upload_files)       │     │   (whale-erp-files)     │
└─────────────────────────┘     └─────────────────────────┘
```

### 2.3 Polymorphic Association 패턴

단일 `upload_files` 테이블로 여러 엔티티와 연결:

```
┌──────────────┐     ┌───────────────────┐     ┌──────────────┐
│    Store     │◄────┤   upload_files    ├────►│     Menu     │
│  (점포)      │     │                   │     │   (메뉴)     │
└──────────────┘     │ reference_type    │     └──────────────┘
                     │ reference_id      │
┌──────────────┐     │                   │     ┌──────────────┐
│ Organization │◄────┤                   ├────►│    Member    │
│   (조직)     │     └───────────────────┘     │   (회원)     │
└──────────────┘                               └──────────────┘
```

---

## 3. API 명세

### 3.1 기본 정보

- **Base URL**: `/api/v1/files`
- **Content-Type**: `multipart/form-data` (업로드), `application/json` (기타)

### 3.2 엔드포인트 목록

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/attachments` | 첨부파일 업로드 |
| POST | `/images` | 이미지 업로드 |
| GET | `/{fileId}` | 파일 상세 조회 |
| GET | `/{fileId}/download-url` | 다운로드 URL 조회 |
| GET | `/` | 파일 목록 조회 (페이징) |
| GET | `/by-reference` | 엔티티별 파일 목록 조회 |
| DELETE | `/{fileId}` | 파일 삭제 (소프트 삭제) |

### 3.3 상세 API 명세

#### 3.3.1 첨부파일 업로드

```http
POST /api/v1/files/attachments
Content-Type: multipart/form-data
```

**Request Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| file | MultipartFile | ✅ | 업로드할 파일 |
| category | UploadFileCategory | ✅ | 파일 카테고리 |
| referenceType | ReferenceType | ✅ | 연결 엔티티 타입 |
| referenceId | Long | ✅ | 연결 엔티티 ID |

**Example Request:**

```bash
curl -X POST "http://localhost:8080/api/v1/files/attachments" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@contract.pdf" \
  -F "category=STORE_RENT_CONTRACT" \
  -F "referenceType=STORE" \
  -F "referenceId=1"
```

**Example Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "originalFileName": "contract.pdf",
    "storedFileName": "550e8400-e29b-41d4-a716-446655440000.pdf",
    "fileSize": 524288,
    "contentType": "application/pdf",
    "fileExtension": "pdf",
    "uploadFileType": "ATTACHMENT",
    "uploadFileCategory": "STORE_RENT_CONTRACT",
    "referenceType": "STORE",
    "referenceId": 1,
    "isPublic": false,
    "publicUrl": null,
    "createdAt": "2024-01-15T10:30:00"
  },
  "message": "첨부파일 업로드 성공",
  "timestamp": "2024-01-15T10:30:00"
}
```

#### 3.3.2 이미지 업로드

```http
POST /api/v1/files/images
Content-Type: multipart/form-data
```

**Request Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| file | MultipartFile | ✅ | 업로드할 이미지 |
| category | UploadFileCategory | ✅ | 이미지 카테고리 |
| referenceType | ReferenceType | ✅ | 연결 엔티티 타입 |
| referenceId | Long | ✅ | 연결 엔티티 ID |

**Example Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": 2,
    "originalFileName": "menu_chicken.jpg",
    "storedFileName": "550e8400-e29b-41d4-a716-446655440001.jpg",
    "fileSize": 204800,
    "contentType": "image/jpeg",
    "fileExtension": "jpg",
    "uploadFileType": "IMAGE",
    "uploadFileCategory": "MENU_IMAGE",
    "referenceType": "MENU",
    "referenceId": 10,
    "isPublic": true,
    "publicUrl": "https://whale-erp-files.s3.ap-northeast-2.amazonaws.com/images/menu/images/10/550e8400.jpg",
    "createdAt": "2024-01-15T10:35:00"
  },
  "message": "이미지 업로드 성공",
  "timestamp": "2024-01-15T10:35:00"
}
```

#### 3.3.3 파일 상세 조회

```http
GET /api/v1/files/{fileId}
```

**Path Parameters:**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| fileId | Long | 파일 ID |

**Example Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "originalFileName": "contract.pdf",
    "storedFileName": "550e8400-e29b-41d4-a716-446655440000.pdf",
    "fileSize": 524288,
    "contentType": "application/pdf",
    "fileExtension": "pdf",
    "uploadFileType": "ATTACHMENT",
    "uploadFileCategory": "STORE_RENT_CONTRACT",
    "referenceType": "STORE",
    "referenceId": 1,
    "isPublic": false,
    "publicUrl": null,
    "createdAt": "2024-01-15T10:30:00"
  },
  "message": "파일 조회 성공",
  "timestamp": "2024-01-15T10:40:00"
}
```

#### 3.3.4 다운로드 URL 조회

```http
GET /api/v1/files/{fileId}/download-url?expirationMinutes=60
```

**Query Parameters:**

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| expirationMinutes | Long | 60 | Pre-signed URL 만료 시간 (분) |

**Example Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "fileId": 1,
    "originalFileName": "contract.pdf",
    "downloadUrl": "https://whale-erp-files.s3.ap-northeast-2.amazonaws.com/attachments/store/contracts/1/550e8400.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=...",
    "expirationMinutes": 60
  },
  "message": "다운로드 URL 생성 성공",
  "timestamp": "2024-01-15T10:45:00"
}
```

> **Note**: 이미지(공개 파일)의 경우 `expirationMinutes`가 0이며, `publicUrl`이 반환됩니다.

#### 3.3.5 파일 목록 조회 (페이징)

```http
GET /api/v1/files?referenceType=STORE&referenceId=1&category=STORE_IMAGE&page=0&size=20
```

**Query Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| referenceType | ReferenceType | ❌ | 연결 엔티티 타입 필터 |
| referenceId | Long | ❌ | 연결 엔티티 ID 필터 |
| category | UploadFileCategory | ❌ | 파일 카테고리 필터 |
| page | Integer | ❌ | 페이지 번호 (기본: 0) |
| size | Integer | ❌ | 페이지 크기 (기본: 20) |
| sort | String | ❌ | 정렬 (기본: createdAt,desc) |

**Example Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": 3,
        "originalFileName": "store_front.jpg",
        "uploadFileType": "IMAGE",
        "uploadFileCategory": "STORE_IMAGE",
        "referenceType": "STORE",
        "referenceId": 1,
        "isPublic": true,
        "publicUrl": "https://..."
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 5,
    "totalPages": 1,
    "first": true,
    "last": true
  },
  "message": "파일 목록 조회 성공",
  "timestamp": "2024-01-15T10:50:00"
}
```

#### 3.3.6 엔티티별 파일 목록 조회

```http
GET /api/v1/files/by-reference?referenceType=MENU&referenceId=10&category=MENU_IMAGE
```

**Query Parameters:**

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| referenceType | ReferenceType | ✅ | 연결 엔티티 타입 |
| referenceId | Long | ✅ | 연결 엔티티 ID |
| category | UploadFileCategory | ❌ | 파일 카테고리 필터 |

**Example Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "originalFileName": "menu_chicken.jpg",
      "uploadFileType": "IMAGE",
      "uploadFileCategory": "MENU_IMAGE",
      "referenceType": "MENU",
      "referenceId": 10,
      "isPublic": true,
      "publicUrl": "https://..."
    }
  ],
  "message": "파일 목록 조회 성공",
  "timestamp": "2024-01-15T10:55:00"
}
```

#### 3.3.7 파일 삭제

```http
DELETE /api/v1/files/{fileId}
```

**Response (204 No Content):**

응답 본문 없음

> **Note**: 소프트 삭제로 처리되어 `is_deleted = true`, `deleted_at` 값이 설정됩니다. S3의 실제 파일은 삭제되지 않습니다.

---

## 4. 데이터 모델

### 4.1 UploadFile Entity

```kotlin
@Entity
@Table(name = "upload_files")
class UploadFile(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    // S3 관련 필드
    val s3Bucket: String,           // S3 버킷명
    val s3Key: String,              // S3 객체 키
    val s3Region: String,           // S3 리전

    // 파일 정보
    val originalFileName: String,    // 원본 파일명
    val storedFileName: String,      // 저장된 파일명 (UUID)
    val fileSize: Long,              // 파일 크기 (bytes)
    val contentType: String?,        // MIME 타입
    val fileExtension: String?,      // 파일 확장자

    // 분류 정보
    val uploadFileType: UploadFileType,         // IMAGE or ATTACHMENT
    val uploadFileCategory: UploadFileCategory, // 세부 카테고리

    // Polymorphic Association
    val referenceType: ReferenceType,  // 연결 엔티티 타입
    val referenceId: Long,             // 연결 엔티티 ID

    // 접근 제어
    val isPublic: Boolean = false,   // 공개 여부
    val publicUrl: String? = null,   // 공개 URL

    // 소프트 삭제
    var isDeleted: Boolean = false,
    var deletedAt: LocalDateTime? = null
) : BaseEntity()
```

### 4.2 데이터베이스 스키마

```sql
CREATE TABLE upload_files (
    id                    BIGSERIAL PRIMARY KEY,

    -- S3 관련
    s3_bucket            VARCHAR(100) NOT NULL,
    s3_key               VARCHAR(500) NOT NULL,
    s3_region            VARCHAR(30) NOT NULL,

    -- 파일 정보
    original_file_name   VARCHAR(255) NOT NULL,
    stored_file_name     VARCHAR(255) NOT NULL,
    file_size            BIGINT NOT NULL,
    content_type         VARCHAR(100),
    file_extension       VARCHAR(20),

    -- 분류 정보
    upload_file_type     VARCHAR(30) NOT NULL,
    upload_file_category VARCHAR(50) NOT NULL,

    -- Polymorphic Association
    reference_type       VARCHAR(50) NOT NULL,
    reference_id         BIGINT NOT NULL,

    -- 접근 제어
    is_public            BOOLEAN NOT NULL DEFAULT FALSE,
    public_url           VARCHAR(1000),

    -- 소프트 삭제
    is_deleted           BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at           TIMESTAMP,

    -- 감사 필드 (BaseEntity)
    created_at           TIMESTAMP NOT NULL,
    updated_at           TIMESTAMP NOT NULL,

    -- 제약조건
    CONSTRAINT uk_upload_files_s3_bucket_key UNIQUE (s3_bucket, s3_key)
);

-- 인덱스
CREATE INDEX idx_upload_files_reference ON upload_files (reference_type, reference_id);
CREATE INDEX idx_upload_files_category ON upload_files (upload_file_category);
CREATE INDEX idx_upload_files_is_deleted ON upload_files (is_deleted);
```

---

## 5. 파일 분류 체계

### 5.1 UploadFileType (파일 타입)

파일의 공개 여부를 결정하는 상위 분류입니다.

| 타입 | 설명 | 공개 여부 | 접근 방식 |
|------|------|----------|----------|
| `IMAGE` | 이미지 파일 | ✅ Public | 공개 URL 직접 접근 |
| `ATTACHMENT` | 첨부파일 | ❌ Private | Pre-signed URL |

### 5.2 UploadFileCategory (파일 카테고리)

파일의 용도에 따른 세부 분류입니다.

#### 5.2.1 첨부파일 카테고리 (Private)

| 카테고리 | 설명 | S3 경로 |
|----------|------|---------|
| `STORE_RENT_CONTRACT` | 점포 임대차 계약서 | `attachments/store/contracts` |
| `BUSINESS_REGISTRATION` | 사업자 등록증 | `attachments/store/registration` |
| `BUSINESS_LICENSE` | 영업 허가증 | `attachments/store/license` |
| `STORE_FLOOR_PLAN` | 점포 도면 | `attachments/store/floor-plan` |
| `ETC_ATTACHMENT` | 기타 첨부파일 | `attachments/etc/attachments` |

#### 5.2.2 이미지 카테고리 (Public)

| 카테고리 | 설명 | S3 경로 |
|----------|------|---------|
| `MENU_IMAGE` | 메뉴 이미지 | `images/menu/images` |
| `ORGANIZATION_LOGO_EXPANDED` | 조직 확장 로고 | `images/organization/logo/expanded` |
| `ORGANIZATION_LOGO_COLLAPSED` | 조직 축소 로고 | `images/organization/logo/collapsed` |
| `STORE_IMAGE` | 점포 이미지 | `images/store/images` |
| `ETC_IMAGE` | 기타 이미지 | `images/etc/images` |

### 5.3 ReferenceType (참조 엔티티 타입)

파일이 연결되는 엔티티의 종류입니다.

| 타입 | 설명 | 연결 엔티티 |
|------|------|------------|
| `STORE` | 점포 | Store |
| `MENU` | 메뉴 | Menu |
| `ORGANIZATION` | 조직 | Organization |
| `MEMBER` | 회원 | Member |

### 5.4 카테고리-타입 매핑

```
UploadFileCategory          UploadFileType     ReferenceType
─────────────────────────   ───────────────    ─────────────
STORE_RENT_CONTRACT    ──→  ATTACHMENT     ──→ STORE
BUSINESS_REGISTRATION  ──→  ATTACHMENT     ──→ STORE
BUSINESS_LICENSE       ──→  ATTACHMENT     ──→ STORE
STORE_FLOOR_PLAN       ──→  ATTACHMENT     ──→ STORE
STORE_IMAGE            ──→  IMAGE          ──→ STORE

MENU_IMAGE             ──→  IMAGE          ──→ MENU

ORGANIZATION_LOGO_*    ──→  IMAGE          ──→ ORGANIZATION

ETC_ATTACHMENT         ──→  ATTACHMENT     ──→ ANY
ETC_IMAGE              ──→  IMAGE          ──→ ANY
```

---

## 6. S3 통합

### 6.1 S3 설정

#### application.yml 예시

```yaml
cloud:
  aws:
    s3:
      bucket: whale-erp-files
      region: ap-northeast-2

file:
  upload:
    max-size: 10485760  # 10MB
    presigned-url-expiration: 60  # 분
    s3:
      image-prefix: images
      attachment-prefix: attachments
    allowed-extensions:
      image: jpg,jpeg,png,gif,webp
      attachment: pdf,doc,docx,xls,xlsx,ppt,pptx,hwp,hwpx,zip
```

### 6.2 S3 경로 구조

```
whale-erp-files/
├── images/                          # 공개 이미지 (public-read)
│   ├── menu/images/
│   │   └── {referenceId}/
│   │       └── {uuid}.{ext}
│   ├── store/images/
│   │   └── {referenceId}/
│   │       └── {uuid}.{ext}
│   └── organization/logo/
│       ├── expanded/
│       │   └── {referenceId}/
│       │       └── {uuid}.{ext}
│       └── collapsed/
│           └── {referenceId}/
│               └── {uuid}.{ext}
│
└── attachments/                     # 비공개 첨부파일 (private)
    ├── store/
    │   ├── contracts/
    │   │   └── {referenceId}/
    │   │       └── {uuid}.{ext}
    │   ├── registration/
    │   │   └── {referenceId}/
    │   │       └── {uuid}.{ext}
    │   ├── license/
    │   │   └── {referenceId}/
    │   │       └── {uuid}.{ext}
    │   └── floor-plan/
    │       └── {referenceId}/
    │           └── {uuid}.{ext}
    └── etc/attachments/
        └── {referenceId}/
            └── {uuid}.{ext}
```

### 6.3 S3StorageService 주요 기능

| 메서드 | 설명 |
|--------|------|
| `uploadFile()` | S3에 파일 업로드 |
| `generatePresignedDownloadUrl()` | Pre-signed 다운로드 URL 생성 |
| `deleteFile()` | S3 파일 삭제 |
| `doesFileExist()` | S3 파일 존재 여부 확인 |

### 6.4 ACL 설정

| 파일 타입 | ACL | 설명 |
|----------|-----|------|
| IMAGE | `public-read` | 누구나 URL로 직접 접근 가능 |
| ATTACHMENT | (기본값) | Pre-signed URL로만 접근 가능 |

---

## 7. 보안 고려사항

### 7.1 파일 업로드 보안

#### 7.1.1 파일 크기 제한

```kotlin
if (file.size > fileUploadProperties.maxSize) {
    throw BusinessException(ErrorCode.FILE_SIZE_EXCEEDED)
}
```

- 기본 최대 크기: 10MB
- 설정으로 조정 가능

#### 7.1.2 확장자 검증

```kotlin
// 이미지 허용 확장자
val imageExtensions = listOf("jpg", "jpeg", "png", "gif", "webp")

// 첨부파일 허용 확장자
val attachmentExtensions = listOf("pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "hwp", "hwpx", "zip")
```

#### 7.1.3 빈 파일 검증

```kotlin
if (file.isEmpty) {
    throw BusinessException(ErrorCode.FILE_EMPTY)
}
```

### 7.2 다운로드 보안

#### 7.2.1 Pre-signed URL

비공개 파일(첨부파일)은 Pre-signed URL을 통해서만 접근 가능합니다.

- 기본 만료 시간: 60분
- 요청 시 만료 시간 지정 가능
- 만료 후 URL 무효화

#### 7.2.2 Content-Disposition 보안 (RFC 5987)

HTTP 헤더 인젝션 방지를 위한 파일명 처리:

```kotlin
private fun buildSafeContentDisposition(originalFileName: String): String {
    // 1. 제어 문자 제거 (CR, LF, NUL 등)
    // 2. 파일명 길이 제한 (200자)
    // 3. RFC 5987 percent-encoding 적용
    // 4. ASCII 폴백 파일명 생성

    return "attachment; filename=\"$fallbackFileName\"; filename*=UTF-8''$encodedFileName"
}
```

### 7.3 소프트 삭제

파일 삭제 시 즉시 S3에서 삭제하지 않고 소프트 삭제 처리합니다.

```kotlin
fun softDelete() {
    this.isDeleted = true
    this.deletedAt = LocalDateTime.now()
}
```

**이점:**
- 실수로 삭제된 파일 복구 가능
- 감사 로그 유지
- 배치 작업으로 일괄 정리 가능

---

## 8. 사용 예시

### 8.1 메뉴 이미지 업로드

```kotlin
// Service 레이어에서 메뉴 이미지 업로드
@Transactional
fun uploadMenuImage(menuId: Long, imageFile: MultipartFile): UploadFileResponse {
    return fileUploadService.uploadImage(
        file = imageFile,
        category = UploadFileCategory.MENU_IMAGE,
        referenceType = ReferenceType.MENU,
        referenceId = menuId
    )
}
```

### 8.2 점포 계약서 업로드

```kotlin
// Service 레이어에서 점포 계약서 업로드
@Transactional
fun uploadStoreContract(storeId: Long, contractFile: MultipartFile): UploadFileResponse {
    return fileUploadService.uploadAttachment(
        file = contractFile,
        category = UploadFileCategory.STORE_RENT_CONTRACT,
        referenceType = ReferenceType.STORE,
        referenceId = storeId
    )
}
```

### 8.3 점포별 파일 목록 조회

```kotlin
// 특정 점포의 모든 파일 조회
fun getStoreFiles(storeId: Long): List<UploadFileResponse> {
    return fileUploadService.getFilesByReference(
        referenceType = ReferenceType.STORE,
        referenceId = storeId
    )
}

// 특정 점포의 이미지만 조회
fun getStoreImages(storeId: Long): List<UploadFileResponse> {
    return fileUploadService.getFilesByReferenceAndCategory(
        referenceType = ReferenceType.STORE,
        referenceId = storeId,
        category = UploadFileCategory.STORE_IMAGE
    )
}
```

### 8.4 다운로드 URL 생성

```kotlin
// 첨부파일 다운로드 URL 생성 (30분 유효)
fun getContractDownloadUrl(fileId: Long): String {
    return fileUploadService.getDownloadUrl(
        fileId = fileId,
        expirationMinutes = 30
    )
}
```

### 8.5 Frontend 통합 예시

```typescript
// 이미지 업로드
async function uploadMenuImage(menuId: number, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', 'MENU_IMAGE');
  formData.append('referenceType', 'MENU');
  formData.append('referenceId', menuId.toString());

  const response = await fetch('/api/v1/files/images', {
    method: 'POST',
    body: formData
  });

  return response.json();
}

// 이미지 URL 바로 사용 (공개 URL)
function displayMenuImage(uploadFileResponse) {
  return uploadFileResponse.publicUrl;
}

// 첨부파일 다운로드
async function downloadContract(fileId: number) {
  const response = await fetch(`/api/v1/files/${fileId}/download-url`);
  const { data } = await response.json();

  // 새 탭에서 다운로드
  window.open(data.downloadUrl, '_blank');
}
```

---

## 9. 테스트 가이드

### 9.1 테스트 구조

```
src/test/kotlin/com/interplug/whaleerpapi/domain/uploadfile/
└── FileUploadServiceTest.kt    # Service 단위 테스트
```

### 9.2 테스트 케이스 목록

| 테스트 그룹 | 테스트 케이스 |
|------------|--------------|
| **이미지 업로드** | 성공, 잘못된 카테고리 예외 |
| **첨부파일 업로드** | 성공, 잘못된 카테고리 예외 |
| **파일 조회** | 성공, 파일 없음 예외 |
| **다운로드 URL** | Pre-signed URL 생성, 공개 URL 반환 |
| **파일 삭제** | 소프트 삭제 성공, 파일 없음 예외 |
| **목록 조회** | 참조별 조회, 빈 목록, 페이징 조회 |

### 9.3 테스트 실행

```bash
# 전체 테스트
./gradlew test

# FileUploadService 테스트만 실행
./gradlew test --tests "*.FileUploadServiceTest"

# 커버리지 리포트 생성
./gradlew test jacocoTestReport
```

### 9.4 테스트 예시

```kotlin
@Test
@DisplayName("이미지 파일을 성공적으로 업로드한다")
fun `이미지 업로드 성공`() {
    // given
    val category = UploadFileCategory.MENU_IMAGE
    val referenceType = ReferenceType.MENU
    val referenceId = 1L

    whenever(s3StorageService.uploadFile(any(), eq(category), eq(referenceId)))
        .thenReturn(mockS3UploadResult)
    whenever(uploadFileRepository.save(any()))
        .thenReturn(mockUploadFile)

    // when
    val result = fileUploadService.uploadImage(
        file = mockMultipartFile,
        category = category,
        referenceType = referenceType,
        referenceId = referenceId
    )

    // then
    assertNotNull(result)
    assertEquals("test-image.jpg", result.originalFileName)
    assertEquals(UploadFileType.IMAGE, result.uploadFileType)
    assertNotNull(result.publicUrl)

    verify(s3StorageService).uploadFile(any(), eq(category), eq(referenceId))
    verify(uploadFileRepository).save(any())
}
```

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0.0 | 2024-12-04 | Claude | 최초 작성 |

---

## 관련 문서

- [CLAUDE.md](../../CLAUDE.md) - 프로젝트 개요
- [DEVELOPMENT_GUIDE.md](../DEVELOPMENT_GUIDE.md) - 개발 가이드
- [entity-design-guide.md](../reference/entity-design-guide.md) - 엔티티 설계 가이드
