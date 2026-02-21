import { ProductStatus } from "../enums/product-status.enum";

export interface ListProductsRequest {
    page?: number;
    limit?: number;
    status?: ProductStatus | string;
    category?: string;
    search?: string;
    barcode?: string;
}

export interface ProductResponse {
    product_id: number;
    product_code: string;
    product_name: string;
    barcode: string;
    price: number;
    category: string | null;
    description: string | null;
    image_path: string | null;
    low_stock_threshold: number | null;
    has_expiry?: boolean;
    stock_quantity: number;
    status: ProductStatus;
    created_at: Date;
    updated_at: Date;
}

export interface ListProductsResponse {
    products: ProductResponse[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    }
}

export interface GetProductResponse extends ProductResponse { }

export interface CreateProductRequest {
    product_code?: string;
    product_name: string;
    barcode: string;
    price: number;
    category?: string | null;
    description?: string | null;
    image_path?: string | null;
    low_stock_threshold?: number | null;
    has_expiry?: boolean;
    status: ProductStatus;
}

export interface CreateProductResponse extends ProductResponse { }

export interface UpdateProductRequest {
    product_code?: string;
    product_name?: string;
    barcode?: string;
    price?: number;
    category?: string;
    description?: string;
    image_path?: string;
    low_stock_threshold?: number;
    status?: ProductStatus;
}

export interface UpdateProductResponse extends ProductResponse { }

export interface CategoryCount {
    category: string;
    count: number;
}

export interface GetCategoriesResponse {
    categories: CategoryCount[];
}
