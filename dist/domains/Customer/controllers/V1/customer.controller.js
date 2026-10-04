"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerController = void 0;
const customer_service_1 = require("../../services/V1/customer.service");
const logger_1 = require("../../../../shared/utils/logger");
class CustomerController {
    /**
     * GET /api/v1/customers
     * List customers with pagination, search, and calculated metrics.
     */
    static async listCustomers(req, res) {
        try {
            const user = req.user;
            const searchParam = req.query.search;
            const search = searchParam && searchParam !== 'undefined' && searchParam.trim() ? searchParam.trim() : undefined;
            const request = {
                page: req.query.page ? parseInt(req.query.page, 10) : 1,
                limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
                search,
            };
            const response = await customer_service_1.CustomerService.listCustomers(request, user.userId);
            res.status(200).json({
                success: true,
                data: response,
                message: 'Customers retrieved successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('List customers error', { error: error.message });
            throw error;
        }
    }
    /**
     * POST /api/v1/customers
     * Create a new customer
     */
    static async createCustomer(req, res) {
        try {
            const user = req.user;
            const payload = req.body;
            const customer = await customer_service_1.CustomerService.createCustomer(payload, user.userId);
            res.status(201).json({
                success: true,
                data: customer,
                message: 'Customer created successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Create customer error', { error: error.message });
            throw error;
        }
    }
    /**
     * GET /api/v1/customers/:id
     * Get single customer details with order timeline and payment history
     */
    static async getCustomerDetails(req, res) {
        try {
            const customerId = parseInt(req.params.id, 10);
            const customer = await customer_service_1.CustomerService.getCustomerDetails(customerId);
            res.status(200).json({
                success: true,
                data: customer,
                message: 'Customer details retrieved successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Get customer details error', { error: error.message });
            throw error;
        }
    }
    /**
     * PUT /api/v1/customers/:id
     * Update existing customer
     */
    static async updateCustomer(req, res) {
        try {
            const user = req.user;
            const customerId = parseInt(req.params.id, 10);
            const payload = req.body;
            const updated = await customer_service_1.CustomerService.updateCustomer(customerId, payload, user.userId);
            res.status(200).json({
                success: true,
                data: updated,
                message: 'Customer updated successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Update customer error', { error: error.message });
            throw error;
        }
    }
}
exports.CustomerController = CustomerController;
//# sourceMappingURL=customer.controller.js.map