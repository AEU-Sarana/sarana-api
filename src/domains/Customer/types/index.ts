export interface CustomerPurchase {
  productId: number;
  productName: string;
  quantity: number;
  totalSpent: number;
}

export interface CustomerResponse {
  customerId: number;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  deviceId: string | null;
  createdAt: Date;
  lastBuyAt: Date | null;
  totalPaid: number;
  purchases: CustomerPurchase[];
}

export interface ListCustomersRequest {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ListCustomersResponse {
  customers: CustomerResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
