"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplierService = void 0;
const client_1 = __importDefault(require("../../../database/client"));
const exceptions_1 = require("../../../shared/exceptions");
class SupplierService {
    static async listSuppliers(params) {
        const page = params.page && params.page > 0 ? params.page : 1;
        const limit = params.limit && params.limit > 0 ? params.limit : 50;
        const skip = (page - 1) * limit;
        const where = {};
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
            client_1.default.supplier.findMany({
                where,
                skip,
                take: limit,
                orderBy: { companyName: 'asc' },
            }),
            client_1.default.supplier.count({ where }),
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
    static async getSupplierById(supplierId) {
        const supplier = await client_1.default.supplier.findUnique({
            where: { supplierId: supplierId },
        });
        if (!supplier) {
            throw new exceptions_1.NotFoundException('Supplier not found');
        }
        return supplier;
    }
    static async createSupplier(input) {
        if (!input.companyName || input.companyName.trim().length === 0) {
            throw new exceptions_1.ValidationException('Company name is required');
        }
        return await client_1.default.supplier.create({
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
    static async updateSupplier(supplierId, input) {
        await this.getSupplierById(supplierId);
        return await client_1.default.supplier.update({
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
    static async deleteSupplier(supplierId) {
        await this.getSupplierById(supplierId);
        return await client_1.default.supplier.update({
            where: { supplierId: supplierId },
            data: { isActive: false, updatedAt: new Date() },
        });
    }
}
exports.SupplierService = SupplierService;
//# sourceMappingURL=supplier.service.js.map