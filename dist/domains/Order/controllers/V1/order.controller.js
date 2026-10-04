"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderController = void 0;
const order_service_1 = require("../../../../domains/Order/services/order.service");
const logger_1 = require("../../../../shared/utils/logger");
class OrderController {
    static async listOrders(req, res) {
        try {
            const user = req.user;
            const request = {
                page: req.query.page ? parseInt(req.query.page, 10) : 1,
                limit: req.query.limit ? parseInt(req.query.limit, 10) : 50,
                seller_id: req.query.seller_id ? parseInt(req.query.seller_id, 10) : undefined,
                start_date: req.query.start_date,
                end_date: req.query.end_date,
            };
            const response = await order_service_1.OrderService.listOrders(request, user);
            res.status(200).json({
                success: true,
                data: response,
                message: 'Orders retrieved successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('List orders error', { error: error.message });
            throw error;
        }
    }
    static async getOrder(req, res) {
        try {
            const user = req.user;
            const orderId = parseInt(req.params.id, 10);
            const response = await order_service_1.OrderService.getOrder(orderId, user);
            res.status(200).json({
                success: true,
                data: response,
                message: 'Order retrieved successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Get order error', { error: error.message });
            throw error;
        }
    }
    static async createOrder(req, res) {
        try {
            const user = req.user;
            const response = await order_service_1.OrderService.createOrder(req.body, user);
            res.status(201).json({
                success: true,
                data: response,
                message: 'Order created successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Create order error', { error: error.message });
            throw error;
        }
    }
    static async requestCancellation(req, res) {
        try {
            const user = req.user;
            const orderId = parseInt(req.params.id, 10);
            const { reason } = req.body;
            const response = await order_service_1.OrderService.requestOrderCancellation(orderId, reason, user);
            res.status(200).json({
                success: true,
                data: response,
                message: 'Cancellation requested successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Request order cancellation error', { error: error.message });
            throw error;
        }
    }
    static async approveCancellation(req, res) {
        try {
            const user = req.user;
            const orderId = parseInt(req.params.id, 10);
            const response = await order_service_1.OrderService.approveOrderCancellation(orderId, user);
            res.status(200).json({
                success: true,
                data: response,
                message: 'Order cancellation approved successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Approve order cancellation error', { error: error.message });
            throw error;
        }
    }
    static async rejectCancellation(req, res) {
        try {
            const user = req.user;
            const orderId = parseInt(req.params.id, 10);
            const { reason } = req.body;
            const response = await order_service_1.OrderService.rejectOrderCancellation(orderId, reason, user);
            res.status(200).json({
                success: true,
                data: response,
                message: 'Order cancellation rejected successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Reject order cancellation error', { error: error.message });
            throw error;
        }
    }
    static async listCancellationRequests(req, res) {
        try {
            const user = req.user;
            const response = await order_service_1.OrderService.listCancellationRequests(user);
            res.status(200).json({
                success: true,
                data: response,
                message: 'Cancellation requests retrieved successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('List cancellation requests error', { error: error.message });
            throw error;
        }
    }
}
exports.OrderController = OrderController;
//# sourceMappingURL=order.controller.js.map