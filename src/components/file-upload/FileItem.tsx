"use client";

import React, { useState } from "react";
import { UploadFileResponse } from "@/types/file-upload";
import { fileUploadApi } from "@/lib/api/fileUpload";

interface FileItemProps {
  file: UploadFileResponse;
  onDelete: (fileId: number) => void;
}

export default function FileItem({ file, onDelete }: FileItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    setIsDeleting(true);
    try {
      await fileUploadApi.deleteFile(file.id);
      onDelete(file.id);
    } catch (error) {
      console.error("Failed to delete file:", error);
      alert("Failed to delete file");
      setIsDeleting(false);
    }
  };

  const handleDownload = async () => {
    try {
      if (file.isPublic && file.publicUrl) {
        window.open(file.publicUrl, "_blank");
      } else {
        const response = await fileUploadApi.getDownloadUrl(file.id);
        if (response.success && response.data.downloadUrl) {
          window.open(response.data.downloadUrl, "_blank");
        } else {
          alert("Failed to get download URL");
        }
      }
    } catch (error) {
      console.error("Failed to download file:", error);
      alert("Failed to download file");
    }
  };

  const isImage = file.uploadFileType === "IMAGE";

  return (
    <div className="group relative bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
          {isImage && file.publicUrl ? (
            <img
              src={file.publicUrl}
              alt={file.originalFileName}
              className="w-full h-full object-cover"
            />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6 text-slate-500"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">
            {file.originalFileName}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {(file.fileSize / 1024).toFixed(1)} KB •{" "}
            {new Date(file.createdAt).toLocaleDateString()}
          </p>
          <div className="mt-2 flex space-x-2">
            <button
              onClick={handleDownload}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
            >
              Download
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-xs font-medium text-red-600 hover:text-red-500 disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
