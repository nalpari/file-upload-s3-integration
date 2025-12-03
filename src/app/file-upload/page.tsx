"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  ReferenceType,
  UploadFileCategory,
  UploadFileResponse,
  UploadFileType,
} from "@/types/file-upload";
import { fileUploadApi } from "@/lib/api/fileUpload";
import FileUpload from "@/components/file-upload/FileUpload";
import FileList from "@/components/file-upload/FileList";

export default function FileUploadPage() {
  // Filter States
  const [referenceType, setReferenceType] = useState<ReferenceType>("STORE");
  const [referenceId, setReferenceId] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<UploadFileType>("IMAGE");
  const [selectedCategory, setSelectedCategory] =
    useState<UploadFileCategory>("STORE_IMAGE");

  // Data States
  const [files, setFiles] = useState<UploadFileResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch files
  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      // In a real app, we might filter by category in the API call if needed
      // For now, let's fetch all files for the reference and filter client-side or just show them
      // The API supports filtering by category, so let's use that if a specific category is selected
      // However, for the tab view (Image vs Attachment), we might want to fetch all and filter,
      // or fetch by type if the API supported it. The API supports category.

      // Let's fetch all files for the reference to show in the list,
      // but maybe we want to filter by the active tab (Image vs Attachment)
      // The API doesn't have a direct "type" filter, but we can filter client side or use category.

      const response = await fileUploadApi.getFilesByReference(
        referenceType,
        referenceId
      );
      if (response.success) {
        // Filter by active tab (IMAGE vs ATTACHMENT)
        const filteredFiles = response.data.filter(
          (f) => f.uploadFileType === activeTab
        );
        setFiles(filteredFiles);
      }
    } catch (error) {
      console.error("Failed to fetch files:", error);
    } finally {
      setIsLoading(false);
    }
  }, [referenceType, referenceId, activeTab]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUploadSuccess = () => {
    fetchFiles();
  };

  const handleDelete = (fileId: number) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // Categories based on active tab
  const imageCategories: UploadFileCategory[] = [
    "STORE_IMAGE",
    "MENU_IMAGE",
    "ORGANIZATION_LOGO_EXPANDED",
    "ORGANIZATION_LOGO_COLLAPSED",
    "ETC_IMAGE",
  ];

  const attachmentCategories: UploadFileCategory[] = [
    "STORE_RENT_CONTRACT",
    "BUSINESS_REGISTRATION",
    "BUSINESS_LICENSE",
    "STORE_FLOOR_PLAN",
    "ETC_ATTACHMENT",
  ];

  const currentCategories =
    activeTab === "IMAGE" ? imageCategories : attachmentCategories;

  // Update selected category when tab changes if current selection is invalid
  useEffect(() => {
    if (activeTab === "IMAGE" && !imageCategories.includes(selectedCategory)) {
      setSelectedCategory("STORE_IMAGE");
    } else if (
      activeTab === "ATTACHMENT" &&
      !attachmentCategories.includes(selectedCategory)
    ) {
      setSelectedCategory("STORE_RENT_CONTRACT");
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            File Upload Integration
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Manage your images and documents securely with S3 integration.
          </p>
        </div>

        {/* Controls Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Reference Type Selector */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Reference Type
              </label>
              <select
                value={referenceType}
                onChange={(e) =>
                  setReferenceType(e.target.value as ReferenceType)
                }
                className="w-full rounded-lg border-slate-300 border p-2.5 text-slate-900 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="STORE">Store</option>
                <option value="MENU">Menu</option>
                <option value="ORGANIZATION">Organization</option>
                <option value="MEMBER">Member</option>
              </select>
            </div>

            {/* Reference ID Input */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Reference ID
              </label>
              <input
                type="number"
                value={referenceId}
                onChange={(e) => setReferenceId(Number(e.target.value))}
                className="w-full rounded-lg border-slate-300 border p-2.5 text-slate-900 focus:ring-indigo-500 focus:border-indigo-500"
                min="1"
              />
            </div>

            {/* Category Selector */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Upload Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) =>
                  setSelectedCategory(e.target.value as UploadFileCategory)
                }
                className="w-full rounded-lg border-slate-300 border p-2.5 text-slate-900 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {currentCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 mb-8">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("IMAGE")}
              className={`${
                activeTab === "IMAGE"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Images
            </button>
            <button
              onClick={() => setActiveTab("ATTACHMENT")}
              className={`${
                activeTab === "ATTACHMENT"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Attachments
            </button>
          </nav>
        </div>

        {/* Upload Section */}
        <div className="mb-12">
          <FileUpload
            referenceType={referenceType}
            referenceId={referenceId}
            category={selectedCategory}
            onUploadSuccess={handleUploadSuccess}
            label={`Upload ${activeTab === "IMAGE" ? "Image" : "Document"}`}
            accept={
              activeTab === "IMAGE"
                ? "image/*"
                : ".pdf,.doc,.docx,.xls,.xlsx,.zip"
            }
          />
        </div>

        {/* File List Section */}
        <div>
          <h2 className="text-lg font-medium text-slate-900 mb-4">
            Uploaded {activeTab === "IMAGE" ? "Images" : "Files"}
          </h2>
          <FileList
            files={files}
            isLoading={isLoading}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}
