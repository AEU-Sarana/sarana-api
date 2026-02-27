export interface PackageResponse {
    id: number;
    name: string;
    description: string | null;
    is_active: boolean;
    created_at: Date;
}

export interface ListPackagesResponse {
    packages: PackageResponse[];
}

export interface CreatePackageRequest {
    name: string;
    description?: string;
    is_active?: boolean;
}

export interface CreatePackageResponse {
    id: number;
    name: string;
    description: string | null;
    is_active: boolean;
    created_at: Date;
}
