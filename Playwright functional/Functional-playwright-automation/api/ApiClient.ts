import { LogHelper } from '../logger/LogHelper';
import { ConfigManager } from '../config/ConfigManager';

export interface ApiRequestOptions {
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}

export interface ApiResponse<T = unknown> {
  status: number;
  data: T;
  durationMs: number;
}

/**
 * Lightweight API client with centralized logging to logs/api/api.log
 */
export class ApiClient {
  constructor(private readonly baseUrl = ConfigManager.getBaseUrl()) {}

  async get<T>(path: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path, options);
  }

  async post<T>(path: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, options);
  }

  async put<T>(path: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, options);
  }

  async delete<T>(path: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path, options);
  }

  private async request<T>(
    method: string,
    path: string,
    options: ApiRequestOptions,
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    const started = Date.now();

    LogHelper.logApi(method, url, { requestBody: options.body });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    const apiKey = ConfigManager.getApiKey();
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: options.timeoutMs ? AbortSignal.timeout(options.timeoutMs) : undefined,
    });

    const durationMs = Date.now() - started;
    const data = (await response.json().catch(() => ({}))) as T;

    LogHelper.logApi(method, url, {
      status: response.status,
      durationMs,
      responseBody: data,
    });

    return { status: response.status, data, durationMs };
  }
}

export function createApiClient(baseUrl?: string): ApiClient {
  return new ApiClient(baseUrl);
}
