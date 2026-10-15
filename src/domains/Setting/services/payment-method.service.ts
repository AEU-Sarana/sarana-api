import prisma from '@src/database/client';
import { ValidationException } from '@src/shared/exceptions';
import { logger } from '@src/shared/utils/logger';

export interface CreatePaymentMethodInput {
  name: string;
  code?: string;
  type?: string;
  accountName?: string;
  accountNumber?: string;
  qrCodeUrl?: string;
  note?: string;
  isActive?: boolean;
  displayOrder?: number;
}

export interface UpdatePaymentMethodInput {
  name?: string;
  code?: string;
  type?: string;
  accountName?: string;
  accountNumber?: string;
  qrCodeUrl?: string;
  note?: string;
  isActive?: boolean;
  displayOrder?: number;
}

export class PaymentMethodService {
  /**
   * Get all payment methods (active only or all)
   */
  async getAllPaymentMethods(includeInactive = false) {
    return prisma.paymentMethod.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [
        { displayOrder: 'asc' },
        { paymentMethodId: 'asc' },
      ],
    });
  }

  /**
   * Get a single payment method by ID
   */
  async getPaymentMethodById(id: number) {
    const method = await prisma.paymentMethod.findUnique({
      where: { paymentMethodId: id },
    });

    if (!method) {
      throw new ValidationException('Payment method not found', [], 'PAYMENT_METHOD_NOT_FOUND', 404);
    }

    return method;
  }

  /**
   * Create a new payment method
   */
  async createPaymentMethod(input: CreatePaymentMethodInput) {
    const name = input.name?.trim();
    if (!name) {
      throw new ValidationException('Payment method name is required', [], 'VALIDATION_ERROR', 400);
    }

    // Generate or format code
    let code = input.code?.trim().toUpperCase();
    if (!code) {
      code = name
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .toUpperCase()
        .slice(0, 30);
    }

    // Check uniqueness of code
    const existing = await prisma.paymentMethod.findFirst({
      where: { code },
    });

    if (existing) {
      throw new ValidationException(`Payment method code "${code}" already exists`, [], 'DUPLICATE_CODE', 409);
    }

    // Get next display order if not provided
    let displayOrder = input.displayOrder;
    if (displayOrder === undefined || displayOrder === null) {
      const maxOrder = await prisma.paymentMethod.aggregate({
        _max: { displayOrder: true },
      });
      displayOrder = (maxOrder._max.displayOrder ?? 0) + 1;
    }

    const created = await prisma.paymentMethod.create({
      data: {
        name,
        code,
        type: input.type || 'BANK_TRANSFER',
        accountName: input.accountName?.trim() || null,
        accountNumber: input.accountNumber?.trim() || null,
        qrCodeUrl: input.qrCodeUrl?.trim() || null,
        note: input.note?.trim() || null,
        isActive: input.isActive !== undefined ? input.isActive : true,
        isSystem: false,
        displayOrder,
      },
    });

    logger.info('Created new payment method', { id: created.paymentMethodId, code: created.code });
    return created;
  }

  /**
   * Update a payment method
   */
  async updatePaymentMethod(id: number, input: UpdatePaymentMethodInput) {
    const existing = await this.getPaymentMethodById(id);

    const data: any = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) {
        throw new ValidationException('Payment method name cannot be empty', [], 'VALIDATION_ERROR', 400);
      }
      data.name = name;
    }

    if (input.code !== undefined && input.code.trim().toUpperCase() !== existing.code) {
      if (existing.isSystem) {
        throw new ValidationException('Cannot modify code of system payment method', [], 'SYSTEM_METHOD_PROTECTED', 400);
      }

      const newCode = input.code.trim().toUpperCase();
      const codeCheck = await prisma.paymentMethod.findFirst({
        where: { code: newCode },
      });

      if (codeCheck) {
        throw new ValidationException(`Payment method code "${newCode}" is already in use`, [], 'DUPLICATE_CODE', 409);
      }
      data.code = newCode;
    }

    if (input.type !== undefined) data.type = input.type;
    if (input.accountName !== undefined) data.accountName = input.accountName?.trim() || null;
    if (input.accountNumber !== undefined) data.accountNumber = input.accountNumber?.trim() || null;
    if (input.qrCodeUrl !== undefined) data.qrCodeUrl = input.qrCodeUrl?.trim() || null;
    if (input.note !== undefined) data.note = input.note?.trim() || null;
    if (input.displayOrder !== undefined) data.displayOrder = input.displayOrder;

    if (input.isActive !== undefined) {
      if (existing.isSystem && existing.code === 'CASH' && !input.isActive) {
        throw new ValidationException('Default CASH payment method cannot be deactivated', [], 'SYSTEM_METHOD_PROTECTED', 400);
      }
      data.isActive = input.isActive;
    }

    const updated = await prisma.paymentMethod.update({
      where: { paymentMethodId: id },
      data,
    });

    logger.info('Updated payment method', { id: updated.paymentMethodId, code: updated.code });
    return updated;
  }

  /**
   * Toggle active/inactive status
   */
  async togglePaymentMethodStatus(id: number) {
    const existing = await this.getPaymentMethodById(id);

    if (existing.isSystem && existing.code === 'CASH' && existing.isActive) {
      throw new ValidationException('Default CASH payment method cannot be deactivated', [], 'SYSTEM_METHOD_PROTECTED', 400);
    }

    const updated = await prisma.paymentMethod.update({
      where: { paymentMethodId: id },
      data: {
        isActive: !existing.isActive,
        updatedAt: new Date(),
      },
    });

    logger.info('Toggled payment method status', { id: updated.paymentMethodId, isActive: updated.isActive });
    return updated;
  }

  /**
   * Delete a payment method
   */
  async deletePaymentMethod(id: number) {
    const existing = await this.getPaymentMethodById(id);

    if (existing.isSystem) {
      throw new ValidationException('Cannot delete default system payment method', [], 'SYSTEM_METHOD_PROTECTED', 400);
    }

    await prisma.paymentMethod.delete({
      where: { paymentMethodId: id },
    });

    logger.info('Deleted payment method', { id, code: existing.code });
    return { success: true, message: `Payment method "${existing.name}" deleted successfully` };
  }
}
