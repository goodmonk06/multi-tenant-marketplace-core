import { logger } from '../logger';

export enum StorageProvider {
  S3 = 's3',
  GCS = 'gcs',
  AZURE_BLOB = 'azure_blob',
  LOCAL = 'local',
}

export interface UploadParams {
  file: Buffer | NodeJS.ReadableStream;
  fileName: string;
  mimeType: string;
  folder?: string;
  metadata?: Record<string, string>;
  isPublic?: boolean;
}

export interface UploadResult {
  success: boolean;
  url: string;
  key: string;
  size?: number;
  error?: string;
}

export interface DeleteParams {
  key: string;
}

export interface GetSignedUrlParams {
  key: string;
  expiresIn?: number; // seconds, default 3600
  action?: 'read' | 'write';
}

export interface ListFilesParams {
  folder?: string;
  maxResults?: number;
  pageToken?: string;
}

export interface FileMetadata {
  key: string;
  size: number;
  mimeType: string;
  url: string;
  lastModified: Date;
  metadata?: Record<string, string>;
}

/**
 * Interface for cloud storage adapters
 * Supports S3, Google Cloud Storage, Azure Blob, etc.
 */
export interface IStorageAdapter {
  /**
   * Upload a file to storage
   */
  upload(
    params: UploadParams,
    tenantId: string,
  ): Promise<UploadResult>;

  /**
   * Delete a file from storage
   */
  delete(params: DeleteParams, tenantId: string): Promise<boolean>;

  /**
   * Get a signed URL for temporary access
   */
  getSignedUrl(
    params: GetSignedUrlParams,
    tenantId: string,
  ): Promise<string>;

  /**
   * List files in a folder
   */
  listFiles(
    params: ListFilesParams,
    tenantId: string,
  ): Promise<{
    files: FileMetadata[];
    nextPageToken?: string;
  }>;

  /**
   * Check if a file exists
   */
  exists(key: string, tenantId: string): Promise<boolean>;

  /**
   * Get the storage provider name
   */
  getProvider(): StorageProvider;
}

/**
 * In-memory stub implementation for development/testing
 */
export class InMemoryStorageAdapter implements IStorageAdapter {
  private files: Map<string, {
    buffer: Buffer;
    fileName: string;
    mimeType: string;
    folder?: string;
    metadata?: Record<string, string>;
    isPublic: boolean;
    uploadedAt: Date;
  }> = new Map();

  async upload(
    params: UploadParams,
    tenantId: string,
  ): Promise<UploadResult> {
    const key = params.folder
      ? `${tenantId}/${params.folder}/${params.fileName}`
      : `${tenantId}/${params.fileName}`;

    let buffer: Buffer;
    if (Buffer.isBuffer(params.file)) {
      buffer = params.file;
    } else {
      // If it's a stream, we'd need to read it
      // For stub, just create an empty buffer
      buffer = Buffer.from('mock-file-content');
    }

    this.files.set(key, {
      buffer,
      fileName: params.fileName,
      mimeType: params.mimeType,
      folder: params.folder,
      metadata: params.metadata,
      isPublic: params.isPublic || false,
      uploadedAt: new Date(),
    });

    const url = params.isPublic
      ? `https://storage.example.com/${key}`
      : key; // Private files return key, not URL

    logger.info('File uploaded (in-memory)', {
      key,
      fileName: params.fileName,
      size: buffer.length,
      tenantId,
    });

    return {
      success: true,
      url,
      key,
      size: buffer.length,
    };
  }

  async delete(params: DeleteParams, tenantId: string): Promise<boolean> {
    const deleted = this.files.delete(params.key);

    logger.info('File deleted (in-memory)', {
      key: params.key,
      success: deleted,
      tenantId,
    });

    return deleted;
  }

  async getSignedUrl(
    params: GetSignedUrlParams,
    tenantId: string,
  ): Promise<string> {
    const file = this.files.get(params.key);

    if (!file) {
      throw new Error(`File not found: ${params.key}`);
    }

    const expiresIn = params.expiresIn || 3600;
    const expiresAt = Date.now() + expiresIn * 1000;

    const signedUrl = `https://storage.example.com/${params.key}?expires=${expiresAt}&signature=mock-signature`;

    logger.info('Signed URL generated (in-memory)', {
      key: params.key,
      expiresIn,
      tenantId,
    });

    return signedUrl;
  }

  async listFiles(
    params: ListFilesParams,
    tenantId: string,
  ): Promise<{
    files: FileMetadata[];
    nextPageToken?: string;
  }> {
    const prefix = params.folder
      ? `${tenantId}/${params.folder}/`
      : `${tenantId}/`;

    const matchingFiles: FileMetadata[] = [];

    for (const [key, file] of this.files.entries()) {
      if (key.startsWith(prefix)) {
        matchingFiles.push({
          key,
          size: file.buffer.length,
          mimeType: file.mimeType,
          url: file.isPublic ? `https://storage.example.com/${key}` : key,
          lastModified: file.uploadedAt,
          metadata: file.metadata,
        });
      }
    }

    const maxResults = params.maxResults || 100;
    const files = matchingFiles.slice(0, maxResults);

    logger.info('Files listed (in-memory)', {
      folder: params.folder,
      count: files.length,
      tenantId,
    });

    return {
      files,
      nextPageToken: matchingFiles.length > maxResults ? 'mock-token' : undefined,
    };
  }

  async exists(key: string, tenantId: string): Promise<boolean> {
    return this.files.has(key);
  }

  getProvider(): StorageProvider {
    return StorageProvider.LOCAL;
  }

  // Helper for testing
  clear() {
    this.files.clear();
  }
}

// Export singleton instance
export const storageAdapter: IStorageAdapter = new InMemoryStorageAdapter();
