"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplierController = void 0;
const supplier_service_1 = require("../../../../domains/Supplier/services/supplier.service");
class SupplierController {
    static async listSuppliers(req, res) {
        try {
            const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
            const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
            const search = typeof req.query.search === 'string' ? req.query.search : undefined;
            const isActive = req.query.isActive !== undefined ? String(req.query.isActive) === 'true' : undefined;
            const result = await supplier_service_1.SupplierService.listSuppliers({ page, limit, search, isActive });
            res.status(200).json({
                success: true,
                data: result.suppliers,
                pagination: result.pagination,
                message: 'Suppliers retrieved successfully',
            });
        }
        catch (error) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to fetch suppliers',
            });
        }
    }
    static async getSupplier(req, res) {
        try {
            const supplierId = parseInt(String(req.params.id), 10);
            const supplier = await supplier_service_1.SupplierService.getSupplierById(supplierId);
            res.status(200).json({
                success: true,
                data: supplier,
                message: 'Supplier retrieved successfully',
            });
        }
        catch (error) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to fetch supplier',
            });
        }
    }
    static async createSupplier(req, res) {
        try {
            const supplier = await supplier_service_1.SupplierService.createSupplier(req.body);
            res.status(201).json({
                success: true,
                data: supplier,
                message: 'Supplier created successfully',
            });
        }
        catch (error) {
            res.status(error.statusCode || 400).json({
                success: false,
                message: error.message || 'Failed to create supplier',
            });
        }
    }
    static async updateSupplier(req, res) {
        try {
            const supplierId = parseInt(String(req.params.id), 10);
            const supplier = await supplier_service_1.SupplierService.updateSupplier(supplierId, req.body);
            res.status(200).json({
                success: true,
                data: supplier,
                message: 'Supplier updated successfully',
            });
        }
        catch (error) {
            res.status(error.statusCode || 400).json({
                success: false,
                message: error.message || 'Failed to update supplier',
            });
        }
    }
    static async deleteSupplier(req, res) {
        try {
            const supplierId = parseInt(String(req.params.id), 10);
            await supplier_service_1.SupplierService.deleteSupplier(supplierId);
            res.status(200).json({
                success: true,
                message: 'Supplier deactivated successfully',
            });
        }
        catch (error) {
            res.status(error.statusCode || 400).json({
                success: false,
                message: error.message || 'Failed to delete supplier',
            });
        }
    }
}
exports.SupplierController = SupplierController;
//# sourceMappingURL=supplier.controller.js.map