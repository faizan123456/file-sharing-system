import type {
  ApiError,
  ApiResponse,
  FileItem,
  PaginatedFiles,
  User,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.headers ?? {}),
    },
  });

  const data = (await res.json()) as ApiResponse<T> | ApiError;

  if (!res.ok) {
    const err = data as ApiError;
    const msg = Array.isArray(err.message)
      ? err.message.join(", ")
      : err.message;
    throw new Error(msg ?? "Request failed");
  }

  return data as ApiResponse<T>;
}

// Auth
export async function register(
  username: string,
  email: string,
  password: string,
): Promise<ApiResponse<User>> {
  return request<User>("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
}

export async function login(
  email: string,
  password: string,
): Promise<ApiResponse<{ user: User }>> {
  return request<{ user: User }>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export async function logout(): Promise<ApiResponse<null>> {
  return request<null>("/auth/logout", { method: "POST" });
}

export async function getMe(): Promise<ApiResponse<{ user: User }>> {
  return request<{ user: User }>("/auth/me");
}

// Files
export async function uploadFile(
  file: File,
  expiryTime?: string,
): Promise<ApiResponse<FileItem>> {
  const form = new FormData();
  form.append("file", file);
  if (expiryTime) form.append("expiryTime", expiryTime);

  return request<FileItem>("/upload", {
    method: "POST",
    body: form,
  });
}

export async function listFiles(
  page = 1,
  limit = 20,
): Promise<ApiResponse<PaginatedFiles>> {
  return request<PaginatedFiles>(`/files?page=${page}&limit=${limit}`);
}

export async function getFile(id: string): Promise<ApiResponse<FileItem>> {
  return request<FileItem>(`/files/${id}`);
}

export async function deleteFile(id: string): Promise<ApiResponse<null>> {
  return request<null>(`/files/${id}`, { method: "DELETE" });
}

export async function getSharedFile(
  publicId: string,
): Promise<ApiResponse<{ url: string; file: FileItem }>> {
  return request<{ url: string; file: FileItem }>(`/share/${publicId}`);
}
