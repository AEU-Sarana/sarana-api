export interface Feature {
    feature_code: string;
    feature_value: string | null;
}

export interface PackageResponse {
    id: number;
    name: string;
    description: string | null;
    is_active: boolean;
    features?: Feature[];
    created_at: Date;
}

export interface ListPackagesResponse {
    packages: PackageResponse[];
}

export interface CreatePackageRequest {
    name: string;
    description?: string;
    is_active?: boolean;
    features?: Feature[];
}

export interface CreatePackageResponse {
    id: number;
    name: string;
    description: string | null;
    is_active: boolean;
    features?: Feature[];
    created_at: Date;
}
