/**
 * API Response wrapper
 */
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    code?: string;
    errors?: any[];
  }
  
  /**
   * Pagination metadata
   */
  export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }
  
  /**
   * Paginated response
   */
  export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: PaginationMeta;
  }
  
  /**
   * Timestamp fields
   */
  export interface TimestampFields {
    createdAt: Date;
    updatedAt: Date;
  }
  
  /**
   * Soft delete fields
   */
  export interface SoftDeleteFields {
    deletedAt?: Date | null;
    isDeleted?: boolean;
  }
  
  /**
   * Audit fields
   */
  export interface AuditFields {
    createdBy?: number | null;
    updatedBy?: number | null;
  }
  
  /**
   * Base entity with common fields
   */
  export interface BaseEntity extends TimestampFields, AuditFields {}
  
  /**
   * ID type
   */
  export type ID = number | string;
  
  /**
   * Status type
   */
  export type Status = 'active' | 'inactive' | 'pending' | 'approved' | 'rejected';