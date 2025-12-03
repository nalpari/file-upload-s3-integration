export type UploadFileType = "IMAGE" | "ATTACHMENT";

export type UploadFileCategory =
  // Attachment Categories
  | "STORE_RENT_CONTRACT"
  | "BUSINESS_REGISTRATION"
  | "BUSINESS_LICENSE"
  | "STORE_FLOOR_PLAN"
  | "ETC_ATTACHMENT"
  // Image Categories
  | "MENU_IMAGE"
  | "ORGANIZATION_LOGO_EXPANDED"
  | "ORGANIZATION_LOGO_COLLAPSED"
  | "STORE_IMAGE"
  | "ETC_IMAGE";

export type ReferenceType = "STORE" | "MENU" | "ORGANIZATION" | "MEMBER";

export interface UploadFileResponse {
  id: number;
  originalFileName: string;
  storedFileName: string;
  fileSize: number;
  contentType: string;
  fileExtension: string;
  uploadFileType: UploadFileType;
  uploadFileCategory: UploadFileCategory;
  referenceType: ReferenceType;
  referenceId: number;
  isPublic: boolean;
  publicUrl: string | null;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}
