export interface User {
  userId: string;
  exp: unknown;
  iat: unknown;
  username: string;
  email: string;
}

export interface FileItem {
  id: string;
  userId: string;
  originalName: string;
  size: number;
  mimeType: string;
  url: string;
  publicId: string;
  uploadedAt: string;
  expiryTime: string | null;
  user?: User;
}

export interface PaginatedFiles {
  list: FileItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiResponse<T = null> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiError {
  success?: boolean;
  message: string | string[];
  error?: string;
  statusCode?: number;
}
