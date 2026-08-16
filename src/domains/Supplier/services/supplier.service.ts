import prisma from '@src/database/client';
import { NotFoundException, ValidationException } from '@src/shared/exceptions';

export interface CreateSupplierInput {
  companyName: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
  paymentTerms?: string;
}

export interface UpdateSupplierInput {
  companyName?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
  paymentTerms?: string;
  isActive?: boolean;
}

export class SupplierService {
  static async listSuppliers(params: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }
    if (params.search) {
      where.OR = [
        { companyName: { contains: params.search, mode: 'insensitive' } },
        { contactPerson: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { companyName: 'asc' },
      }),
      prisma.supplier.count({ where }),
    ]);

    return {
      suppliers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getSupplierById(supplierId: number) {
    const supplier = await prisma.supplier.findUnique({
      where: { supplierId: supplierId },
    });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }
    return supplier;
  }

  static async createSupplier(input: CreateSupplierInput) {
    if (!input.companyName || input.companyName.trim().length === 0) {
      throw new ValidationException('Company name is required');
    }

    return await prisma.supplier.create({
      data: {
        companyName: input.companyName.trim(),
        contactPerson: input.contactPerson?.trim() || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
        taxId: input.taxId?.trim() || null,
        paymentTerms: input.paymentTerms?.trim() || 'NET_30',
        isActive: true,
      },
    });
  }

  static async updateSupplier(supplierId: number, input: UpdateSupplierInput) {
    await this.getSupplierById(supplierId);

    return await prisma.supplier.update({
      where: { supplierId: supplierId },
      data: {
        ...(input.companyName !== undefined && { companyName: input.companyName.trim() }),
        ...(input.contactPerson !== undefined && { contactPerson: input.contactPerson.trim() || null }),
        ...(input.phone !== undefined && { phone: input.phone.trim() || null }),
        ...(input.email !== undefined && { email: input.email.trim() || null }),
        ...(input.address !== undefined && { address: input.address.trim() || null }),
        ...(input.taxId !== undefined && { taxId: input.taxId.trim() || null }),
        ...(input.paymentTerms !== undefined && { paymentTerms: input.paymentTerms.trim() || 'NET_30' }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        updatedAt: new Date(),
      },
    });
  }

  static async deleteSupplier(supplierId: number) {
    await this.getSupplierById(supplierId);
    return await prisma.supplier.update({
      where: { supplierId: supplierId },
      data: { isActive: false, updatedAt: new Date() },
    });
  }
}
