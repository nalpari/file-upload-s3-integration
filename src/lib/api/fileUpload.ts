import {
  ApiResponse,
  PageResponse,
  ReferenceType,
  UploadFileCategory,
  UploadFileResponse,
} from "@/types/file-upload";
import { authService } from "./auth";

const API_BASE_URL = "http://localhost:8080/api/v1/files";

export const fileUploadApi = {
  uploadAttachment: async (
    file: File,
    category: UploadFileCategory,
    referenceType: ReferenceType,
    referenceId: number
  ): Promise<ApiResponse<UploadFileResponse>> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);
    formData.append("referenceType", referenceType);
    formData.append("referenceId", referenceId.toString());

    const authHeader = await authService.getAuthHeader();
    const response = await fetch(`${API_BASE_URL}/attachments`, {
      method: "POST",
      headers: {
        ...authHeader,
      },
      body: formData,
    });
    return handleResponse(response);
  },

  uploadImage: async (
    file: File,
    category: UploadFileCategory,
    referenceType: ReferenceType,
    referenceId: number
  ): Promise<ApiResponse<UploadFileResponse>> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);
    formData.append("referenceType", referenceType);
    formData.append("referenceId", referenceId.toString());

    const authHeader = await authService.getAuthHeader();
    const response = await fetch(`${API_BASE_URL}/images`, {
      method: "POST",
      headers: {
        ...authHeader,
      },
      body: formData,
    });
    return handleResponse(response);
  },

  getFiles: async (
    referenceType: ReferenceType,
    referenceId: number,
    category?: UploadFileCategory,
    page: number = 0,
    size: number = 20
  ): Promise<ApiResponse<PageResponse<UploadFileResponse>>> => {
    const params = new URLSearchParams({
      referenceType,
      referenceId: referenceId.toString(),
      page: page.toString(),
      size: size.toString(),
    });
    if (category) {
      params.append("category", category);
    }

    const authHeader = await authService.getAuthHeader();
    const response = await fetch(`${API_BASE_URL}?${params.toString()}`, {
      headers: {
        ...authHeader,
      },
    });
    return handleResponse(response);
  },

  getFilesByReference: async (
    referenceType: ReferenceType,
    referenceId: number,
    category?: UploadFileCategory
  ): Promise<ApiResponse<UploadFileResponse[]>> => {
    const params = new URLSearchParams({
      referenceType,
      referenceId: referenceId.toString(),
    });
    if (category) {
      params.append("category", category);
    }

    const authHeader = await authService.getAuthHeader();
    const response = await fetch(
      `${API_BASE_URL}/by-reference?${params.toString()}`,
      {
        headers: {
          ...authHeader,
        },
      }
    );
    return handleResponse(response);
  },

  getDownloadUrl: async (
    fileId: number,
    expirationMinutes: number = 60
  ): Promise<
    ApiResponse<{
      fileId: number;
      originalFileName: string;
      downloadUrl: string;
      expirationMinutes: number;
    }>
  > => {
    const authHeader = await authService.getAuthHeader();
    const response = await fetch(
      `${API_BASE_URL}/${fileId}/download-url?expirationMinutes=${expirationMinutes}`,
      {
        headers: {
          ...authHeader,
        },
      }
    );
    return handleResponse(response);
  },

  deleteFile: async (fileId: number): Promise<void> => {
    const authHeader = await authService.getAuthHeader();
    const response = await fetch(`${API_BASE_URL}/${fileId}`, {
      method: "DELETE",
      headers: {
        ...authHeader,
      },
    });
    if (!response.ok) {
      throw new Error("Failed to delete file");
    }
  },
};

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || "API request failed");
  }
  return response.json();
}
