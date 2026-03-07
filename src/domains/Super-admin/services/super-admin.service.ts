import prisma from '@src/database/client';
import { encrypt } from '@src/shared/utils/encryption';
import {
    DashboardSummaryResponse,
    UserGrowthResponse,
    CreateTenantRequest,
    ListPackagesResponse,
    CreatePackageRequest,
    CreatePackageResponse,
    ListPlansResponse,
    CreatePlanRequest,
    CreatePlanResponse,
    UpdatePlanRequest,
    UpdatePlanResponse,
    PlanDetailResponse,
    ListPaymentsResponse,
    UpgradePlanRequest,
    UpgradePlanResponse,
    RenewSubscriptionRequest,
    RenewSubscriptionResponse,
    ListSubscriptionsResponse,
    SubscriptionDetailResponse,
    UpdateTenantRequest,
    UpdateTenantResponse,
    UpdatePackageRequest
} from '../types/V1';

import bcrypt from 'bcrypt';
import { env } from '@src/shared/config/env';
import { generateRandomString } from '@src/shared/utils/helpers';
import { sendEmail } from '@src/shared/services/brevo-mail.service';
import { logger } from '@src/shared/utils/logger';
import { getWelcomeTenantEmailTemplate } from '@src/shared/templates/email/welcome-tenant.template';
import { TelegramBotService } from '@src/domains/Telegram/services/telegram-bot.service';
import { TelegramService } from '@src/domains/Telegram/services/telegram.service';

import { GroupByType, PlanType, TenantStatus } from '../enums/V1';
import { BusinessLogicException } from '@src/shared/exceptions/business-logic.exception';
import { startOfDay, startOfWeek, startOfMonth, startOfYear } from 'date-fns';

export class SuperAdminService {
    /**
     * Get platform statistics summary
     */
    static async getDashboardSummary(period: string): Promise<DashboardSummaryResponse> {
        const now = new Date();
        let startDate: Date | undefined;

        switch (period.toLowerCase()) {
            case 'daily':
                startDate = startOfDay(now);
                break;
            case 'weekly':
                startDate = startOfWeek(now, { weekStartsOn: 1 });
                break;
            case 'monthly':
                startDate = startOfMonth(now);
                break;
            case 'yearly':
                startDate = startOfYear(now);
                break;
            default:
                startDate = undefined;
        }

        const dateFilter = startDate ? { createdAt: { gte: startDate } } : {};

        const totalUser = await prisma.user.count({
            where: { ...dateFilter }
        });

        const activeTenants = await prisma.user.count({
            where: {
                role: 'ADMIN',
                status: 'active',
                ...dateFilter
            }
        });

        const totalSubscriptions = await prisma.subscription.count({
            where: { ...dateFilter }
        });

        // Aggregating subscription overview for the selected period
        const monthly = await prisma.subscription.count({
            where: {
                plan: { type: PlanType.MONTHLY },
                status: 'ACTIVE',
                ...dateFilter
            }
        });
        const yearly = await prisma.subscription.count({
            where: {
                plan: { type: PlanType.YEARLY },
                status: 'ACTIVE',
                ...dateFilter
            }
        });
        const trail = await prisma.subscription.count({
            where: {
                plan: { type: PlanType.TRIAL },
                status: 'ACTIVE',
                ...dateFilter
            }
        });
        const expired = await prisma.subscription.count({
            where: {
                status: 'EXPIRED',
                ...dateFilter
            }
        });

        return {
            stats: {
                total_user: totalUser,
                total_trail: trail,
                active_tenants: activeTenants,
                total_subscriptions: totalSubscriptions,
            },
            subscriptions_overview: {
                monthly,
                yearly,
                trail,
                expired,
            }
        };
    }

    /**
     * Get user growth data
     */
    static async getUserGrowth(groupBy: GroupByType, year?: number): Promise<UserGrowthResponse> {
        const targetYear = year || new Date().getFullYear();

        if (groupBy === GroupByType.MONTH) {
            // Get counts by month for the target year
            const result = await prisma.$queryRaw<Array<{ month: number; count: number }>>`
                SELECT 
                    EXTRACT(MONTH FROM created_at) as month,
                    COUNT(*)::int as count
                FROM users
                WHERE role = 'ADMIN' AND EXTRACT(YEAR FROM created_at) = ${targetYear}
                GROUP BY month
                ORDER BY month
            `;

            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const counts = new Array(12).fill(0);

            result.forEach(row => {
                // months are 1-12 from EXTRACT(MONTH...)
                const monthIndex = Number(row.month) - 1;
                if (monthIndex >= 0 && monthIndex < 12) {
                    counts[monthIndex] = row.count;
                }
            });

            return {
                group_by: groupBy,
                year: targetYear,
                labels: months,
                data: counts,
            };
        } else {
            // Get counts by year for the last 5 years
            const currentYear = new Date().getFullYear();
            const startYear = currentYear - 4;

            const result = await prisma.$queryRaw<Array<{ year: number; count: number }>>`
                SELECT 
                    EXTRACT(YEAR FROM created_at) as year,
                    COUNT(*)::int as count
                FROM users
                WHERE role = 'ADMIN' AND EXTRACT(YEAR FROM created_at) >= ${startYear}
                GROUP BY year
                ORDER BY year
            `;

            const years = [];
            const counts = [];

            for (let y = startYear; y <= currentYear; y++) {
                years.push(y.toString());
                const row = result.find(r => Number(r.year) === y);
                counts.push(row ? row.count : 0);
            }

            return {
                group_by: groupBy,
                labels: years,
                data: counts,
            };
        }
    }

    /**
     * List all subscriptions with tenant and plan info
     */
    static async listSubscriptions(params: any): Promise<ListSubscriptionsResponse> {
        const { page = 1, limit = 20, status, search } = params;
        const skip = (Number(page) - 1) * Number(limit);

        const where: any = {};
        if (status && status !== 'all') where.status = status;
        if (search) {
            where.user = {
                OR: [
                    { businessName: { contains: search, mode: 'insensitive' } },
                    { username: { contains: search, mode: 'insensitive' } },
                ],
            };
        }

        const [subscriptions, total] = await Promise.all([
            prisma.subscription.findMany({
                where,
                skip,
                take: Number(limit),
                include: {
                    plan: true,
                    user: { select: { userId: true, businessName: true, username: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.subscription.count({ where }),
        ]);

        return {
            subscriptions: subscriptions.map((s) => ({
                id: s.id,
                tenant_id: s.tenantId,
                business_name: s.user.businessName ?? null,
                plan_id: s.planId,
                plan_name: s.plan.name,
                plan_type: s.plan.type,
                plan_price: Number(s.plan.price),
                status: s.status,
                start_date: s.startDate,
                end_date: s.endDate ?? null,
                created_at: s.createdAt,
                updated_at: s.updatedAt,
            })),
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        };
    }

    /**
     * Get a specific subscription by ID
     */
    static async getSubscriptionById(id: number): Promise<SubscriptionDetailResponse> {
        const s = await prisma.subscription.findUnique({
            where: { id },
            include: {
                plan: {
                    include: {
                        package: {
                            include: {
                                package_features: {
                                    where: { isEnabled: true }
                                }
                            }
                        }
                    }
                },
                user: {
                    select: {
                        userId: true,
                        businessName: true,
                        username: true,
                        email: true,
                        phone: true
                    }
                },
                subscription_payments: {
                    orderBy: { paymentDate: 'desc' }
                }
            },
        });

        if (!s) {
            throw new BusinessLogicException('Subscription not found', 'SUBSCRIPTION_NOT_FOUND', 404);
        }

        const sub = s as any;

        return {
            id: sub.id,
            tenant_id: sub.tenantId,
            business_name: sub.user.businessName ?? null,
            username: sub.user.username,
            email: sub.user.email ?? null,
            phone: sub.user.phone ?? null,
            status: sub.status,
            start_date: sub.startDate,
            end_date: sub.endDate ?? null,
            close_reason: sub.closeReason ?? null,
            effective_close_date: sub.effectiveCloseDate ?? null,
            created_at: sub.createdAt,
            updated_at: sub.updatedAt,
            plan: {
                id: sub.plan.id,
                name: sub.plan.name,
                type: sub.plan.type,
                price: Number(sub.plan.price),
                package: {
                    id: sub.plan.package.id,
                    name: sub.plan.package.name,
                    description: sub.plan.package.description ?? null,
                    features: sub.plan.package.package_features.map((f: any) => ({
                        feature_code: f.featureCode,
                        feature_value: f.featureValue ?? null,
                    }))
                }
            },
            payments: sub.subscription_payments.map((p: any) => ({
                id: p.id,
                amount: Number(p.amount),
                payment_date: p.paymentDate,
                payment_method: p.paymentMethod,
                status: p.status,
                transaction_id: p.transactionId ?? null
            }))
        };
    }

    /**
     * List all tenants
     */
    static async listTenants(params: any) {
        const { page = 1, limit = 20, status, search, plan_status, plan_id } = params;
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        const where: any = {
            role: 'ADMIN',
        };

        if (status) {
            where.status = { equals: status, mode: 'insensitive' };
        }
        if (plan_id) {
            where.subscriptions = {
                some: {
                    planId: Number(plan_id)
                }
            };
        }
        if (plan_status) {
            const effectivePlanStatus = plan_status.toUpperCase() === 'CLOSE' ? 'CLOSED' : plan_status;
            where.subscriptions = {
                ...where.subscriptions,
                some: {
                    ...(where.subscriptions?.some || {}),
                    status: { equals: effectivePlanStatus, mode: 'insensitive' }
                }
            };
        }

        if (search) {
            where.OR = [
                { businessName: { contains: search, mode: 'insensitive' } },
                { username: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [tenants, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limitNum,
                include: {
                    subscriptions: {
                        include: { plan: true },
                        orderBy: { createdAt: 'desc' },
                        take: 1
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.user.count({ where })
        ]);

        return {
            tenants: tenants.map(t => ({
                id: t.userId,
                business_name: t.businessName,
                username: t.username,
                email: t.email,
                status: t.status,
                subscription: t.subscriptions[0] ? {
                    id: t.subscriptions[0].id,
                    plan_name: t.subscriptions[0].plan.name,
                    plan_type: t.subscriptions[0].plan.type,
                    plan_status: t.subscriptions[0].status,
                    start_date: t.subscriptions[0].startDate,
                    end_date: t.subscriptions[0].endDate,
                    price: Number(t.subscriptions[0].plan.price) // ensure numeric
                } : null
            })),
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        };
    }

    /**
     * Get a single tenant by ID (user_id with role ADMIN)
     */
    static async getTenantById(tenantId: number) {
        const tenant = await prisma.user.findFirst({
            where: { userId: tenantId, role: 'ADMIN' },
            include: {
                telegram_admin_links: {
                    orderBy: { linkedAt: 'desc' },
                    take: 1,
                },
                telegram_config_telegram_config_created_byTousers: {
                    where: { isActive: true },
                    take: 1,
                },
                subscriptions: {
                    include: {
                        plan: { include: { package: true } },
                        subscription_payments: {
                            orderBy: { paymentDate: 'desc' },
                            take: 1,
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                }
            }
        });

        if (!tenant) {
            throw new Error(`Tenant with ID ${tenantId} not found`);
        }

        const activeSubscription = tenant.subscriptions.find(s => s.status === 'ACTIVE') ?? tenant.subscriptions[0] ?? null;
        const latestPayment = activeSubscription?.subscription_payments[0] ?? null;
        const telegramLink = tenant.telegram_admin_links[0] ?? null;
        const botConfig = tenant.telegram_config_telegram_config_created_byTousers[0] ?? null;

        return {
            personal_information: {
                id: tenant.userId,
                business_name: tenant.businessName,
                username: tenant.username,
                full_name: tenant.fullName,
                email: tenant.email,
                phone: tenant.phone,
                address: tenant.address,
                status: tenant.status,
                created_at: tenant.createdAt,
                updated_at: tenant.updatedAt,
            },
            telegram_bot: (botConfig || telegramLink) ? {
                bot_config: botConfig ? {
                    chat_id: botConfig.groupChatId,
                    status: botConfig.isActive ? 'ACTIVE' : 'INACTIVE',
                    last_test_time: botConfig.lastTestTime,
                    last_test_status: botConfig.lastTestStatus,
                } : null,
                admin_link: telegramLink ? {
                    telegram_user_id: telegramLink.telegramUserId.toString(),
                    chat_id: telegramLink.chatId.toString(),
                    status: telegramLink.status,
                    linked_at: telegramLink.linkedAt,
                    last_seen_at: telegramLink.lastSeenAt,
                    revoked_at: telegramLink.revokedAt,
                } : null,
            } : null,
            payment: latestPayment ? {
                id: latestPayment.id,
                amount: Number(latestPayment.amount),
                payment_method: latestPayment.paymentMethod,
                status: latestPayment.status,
                transaction_id: latestPayment.transactionId,
                paid_at: latestPayment.paymentDate,
            } : null,
            subscription: activeSubscription ? {
                id: activeSubscription.id,
                plan_id: activeSubscription.planId,
                plan_name: activeSubscription.plan.name,
                plan_type: activeSubscription.plan.type,
                package_name: activeSubscription.plan.package.name,
                plan_price: Number(activeSubscription.plan.price),
                plan_status: activeSubscription.status,
                start_date: activeSubscription.startDate,
                end_date: activeSubscription.endDate,
                close_reason: activeSubscription.closeReason,
            } : null,
            subscription_history: tenant.subscriptions.map(s => ({
                id: s.id,
                plan_name: s.plan.name,
                plan_type: s.plan.type,
                plan_price: Number(s.plan.price),
                status: s.status,
                start_date: s.startDate,
                end_date: s.endDate,
                created_at: s.createdAt,
            })),
        };
    }

    /**
     * Toggle tenant status: active → inactive / inactive → active
     */
    static async toggleTenantStatus(tenantId: number) {
        const tenant = await prisma.user.findFirst({
            where: { userId: tenantId, role: 'ADMIN' },
            select: { userId: true, status: true },
        });

        if (!tenant) {
            throw new Error(`Tenant with ID ${tenantId} not found`);
        }

        const newStatus = tenant.status === 'active' ? 'inactive' : 'active';

        const updated = await prisma.user.update({
            where: { userId: tenantId },
            data: { status: newStatus },
            select: { userId: true, username: true, businessName: true, status: true, updatedAt: true },
        });

        return {
            id: updated.userId,
            username: updated.username,
            business_name: updated.businessName,
            status: updated.status,
            updated_at: updated.updatedAt,
        };
    }

    /**
     * Update an existing tenant
     */
    static async updateTenant(tenantId: number, data: UpdateTenantRequest): Promise<UpdateTenantResponse> {
        const tenant = await prisma.user.findFirst({
            where: { userId: tenantId, role: 'ADMIN' }
        });

        if (!tenant) {
            throw new Error(`Tenant with ID ${tenantId} not found`);
        }

        const updated = await prisma.user.update({
            where: { userId: tenantId },
            data: {
                businessName: data.business_name,
                username: data.username,
                fullName: data.full_name,
                email: data.email,
                phone: data.phone,
                address: data.address,
                status: data.status?.toLowerCase() as any,
            }
        });

        // Update Subscription if provided
        if (data.plan_type || data.start_time || data.end_time || data.payment_method) {
            const activeSubscription = await prisma.subscription.findFirst({
                where: { tenantId, status: 'ACTIVE' },
                include: { plan: true }
            });

            if (activeSubscription) {
                // If plan type changes, find the new plan
                let newPlanId = activeSubscription.planId;
                let newPlanPrice = activeSubscription.plan.price;

                if (data.plan_type && data.plan_type !== activeSubscription.plan.type) {
                    const plan = await prisma.plan.findFirst({
                        where: { type: data.plan_type, packageId: activeSubscription.plan.packageId }
                    });
                    if (plan) {
                        newPlanId = plan.id;
                        newPlanPrice = plan.price;
                    }
                }

                const newStartDate = data.start_time ? new Date(data.start_time) : activeSubscription.startDate;
                const newEndDate = data.end_time ? new Date(data.end_time) : activeSubscription.endDate;

                await prisma.subscription.update({
                    where: { id: activeSubscription.id },
                    data: {
                        planId: newPlanId,
                        startDate: newStartDate,
                        endDate: newEndDate,
                    }
                });

                if (data.end_time) {
                    await prisma.user.update({
                        where: { userId: tenantId },
                        data: { endAt: new Date(data.end_time) }
                    });
                }

                if (data.payment_method || (data.plan_type && data.plan_type !== activeSubscription.plan.type)) {
                    const payment = await prisma.subscriptionPayment.findFirst({
                        where: { subscriptionId: activeSubscription.id },
                        orderBy: { paymentDate: 'desc' }
                    });

                    if (payment) {
                        await prisma.subscriptionPayment.update({
                            where: { id: payment.id },
                            data: {
                                paymentMethod: data.payment_method || payment.paymentMethod,
                                amount: newPlanPrice
                            }
                        });
                    }
                }
            }
        }

        // Update Telegram Config if provided
        if (data.telegram_bot_token && data.telegram_group_id) {
            const encryptedToken = encrypt(data.telegram_bot_token, process.env.ENCRYPTION_KEY!);

            // Try to find existing config
            const existingConfig = await prisma.telegramConfig.findFirst({
                where: { createdBy: tenantId }
            });

            if (existingConfig) {
                await prisma.telegramConfig.update({
                    where: { configId: existingConfig.configId },
                    data: {
                        botToken: encryptedToken,
                        groupChatId: data.telegram_group_id,
                        isActive: true,
                        updatedBy: tenantId // Assuming tenantId is appropriate here
                    }
                });
            } else {
                await prisma.telegramConfig.create({
                    data: {
                        botToken: encryptedToken,
                        groupChatId: data.telegram_group_id,
                        isActive: true,
                        createdBy: tenantId,
                        updatedBy: tenantId
                    }
                });

                // Send a test/confirmation message if telegram was updated
                try {
                    const confirmationMessage = `*ការតំឡើង Telegram បានជោគជ័យ*
    
អាជីវកម្ម *${data.business_name || tenant.businessName}* បានតំឡើង Telegram ដោយជោគជ័យ។ 
តទៅនេះលោកអ្នកនឹងទទួលបានការជូនដំណឹង និងរបាយការណ៍ដោយផ្ទាល់នៅទីនេះ!`;

                    await TelegramBotService.sendMessage(
                        data.telegram_bot_token!,
                        data.telegram_group_id!,
                        confirmationMessage,
                        'Markdown'
                    );

                    // Register webhook for this bot
                    await TelegramService.registerAdminWebhook(
                        data.telegram_bot_token!,
                        true,
                        tenantId
                    );
                } catch (telegramErr: any) {
                    logger.error('Failed to send Telegram update confirmation', {
                        tenantId,
                        error: telegramErr.message
                    });
                }
            }
        }

        return {
            id: updated.userId,
            business_name: updated.businessName || '',
            username: updated.username,
            full_name: updated.fullName || '',
            email: updated.email || '',
            phone: updated.phone || '',
            address: updated.address || '',
            status: updated.status,
            updated_at: updated.updatedAt
        };
    }

    /**
     * Manually connect Telegram Webhook for a tenant
     */
    static async connectTelegramWebhook(tenantId: number, data?: { bot_token?: string, group_chat_id?: string }) {
        const tenant = await prisma.user.findFirst({
            where: { userId: tenantId, role: 'ADMIN' },
            include: {
                telegram_config_telegram_config_created_byTousers: {
                    take: 1
                }
            }
        });

        if (!tenant) {
            throw new BusinessLogicException('Tenant not found', 'TENANT_NOT_FOUND', 404);
        }

        let tokenToUse = data?.bot_token;

        // If no new token provided, try to use existing config
        if (!tokenToUse) {
            const config = await TelegramService.getTelegramConfig(tenantId);
            if (!config || !config.bot_token) {
                throw new BusinessLogicException('No Telegram Bot Token found for this tenant', 'NO_TOKEN_FOUND', 400);
            }
            tokenToUse = config.bot_token;
        }

        // Attempt to register
        const botInfo = await TelegramService.registerAdminWebhook(tokenToUse, true, tenantId);

        // If they provided new data, update the config
        if (data?.bot_token || data?.group_chat_id) {
            const encryptedToken = data.bot_token ? encrypt(data.bot_token, process.env.ENCRYPTION_KEY!) : undefined;
            const existingConfig = tenant.telegram_config_telegram_config_created_byTousers[0];

            if (existingConfig) {
                await prisma.telegramConfig.update({
                    where: { configId: existingConfig.configId },
                    data: {
                        ...(encryptedToken && { botToken: encryptedToken }),
                        ...(data.group_chat_id && { groupChatId: data.group_chat_id }),
                        isActive: true,
                        updatedBy: tenantId
                    }
                });
            } else if (data.bot_token && data.group_chat_id) {
                await prisma.telegramConfig.create({
                    data: {
                        botToken: encryptedToken!,
                        groupChatId: data.group_chat_id,
                        isActive: true,
                        createdBy: tenantId,
                        updatedBy: tenantId
                    }
                });
            }
        }

        return {
            success: true,
            bot_info: botInfo
        };
    }

    /**
     * Create a new tenant with initial subscription
     */
    static async createTenant(data: CreateTenantRequest) {
        // Generate a random password for the new tenant
        const randomPassword = generateRandomString(10);
        const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
        const hashedPassword = await bcrypt.hash(randomPassword, saltRounds);

        const user = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    username: data.username,
                    email: data.email,
                    fullName: data.full_name,
                    passwordHash: hashedPassword,
                    role: 'ADMIN',
                    businessName: data.business_name,
                    address: data.address,
                    phone: data.phone,
                    status: data.status.toLowerCase() as any,
                    endAt: new Date(data.end_time),
                }
            });

            // after creating the admin user we must set its tenantId to its own id
            await tx.user.update({
                where: { userId: user.userId },
                data: { tenantId: user.userId },
            });

            // Find plan
            const plan = await tx.plan.findFirst({
                where: { packageId: data.package_id, type: data.plan_type }
            });

            if (!plan) {
                // plan must exist in database; return a clear business error instead of raw exception
                throw new BusinessLogicException(
                    `Plan not found for package ID ${data.package_id} and type ${data.plan_type}`,
                    'PLAN_NOT_FOUND',
                    400,
                    { packageId: data.package_id, planType: data.plan_type }
                );
            }

            const subscription = await tx.subscription.create({
                data: {
                    tenantId: user.userId,
                    planId: plan.id,
                    status: 'ACTIVE',
                    startDate: new Date(data.start_time),
                    endDate: new Date(data.end_time),
                }
            });

            if (data.payment_method) {
                await tx.subscriptionPayment.create({
                    data: {
                        subscriptionId: subscription.id,
                        amount: plan.price,
                        paymentMethod: data.payment_method,
                        transactionId: data.transaction_id,
                        status: 'COMPLETED'
                    }
                });
            }

            // Create Telegram Config if provided
            if (data.telegram_bot_token && data.telegram_group_id) {
                const encryptedToken = encrypt(data.telegram_bot_token, process.env.ENCRYPTION_KEY!);
                await tx.telegramConfig.create({
                    data: {
                        botToken: encryptedToken,
                        groupChatId: data.telegram_group_id,
                        isActive: true,
                        createdBy: user.userId,
                        updatedBy: user.userId,
                    }
                });
            }

            return user;
        });

        // Operations after transaction: Telegram registration & Welcome message
        if (data.telegram_bot_token && data.telegram_group_id) {
            try {
                const welcomeMessage = `*សូមស្វាគមន៍មកកាន់ Chlart-POS!*
    
សួរស្តី *${data.full_name}*, 
អាជីវកម្ម *${data.business_name}* បានតភ្ជាប់ដោយជោគជ័យមកកាន់ក្រុមនេះ។ 
តទៅនេះលោកអ្នកនឹងទទួលបានការជូនដំណឹង និងរបាយការណ៍ដោយផ្ទាល់នៅទីនេះ!`

                await TelegramBotService.sendMessage(
                    data.telegram_bot_token,
                    data.telegram_group_id,
                    welcomeMessage,
                    'Markdown'
                );

                // Register webhook for this bot
                await TelegramService.registerAdminWebhook(
                    data.telegram_bot_token,
                    true,
                    user.userId
                );
            } catch (telegramErr: any) {
                logger.error('Failed to setup Telegram for new tenant', {
                    tenantId: user.userId,
                    error: telegramErr.message
                });
            }
        }

        // Send email to tenant with their credentials
        try {
            const { html, text } = getWelcomeTenantEmailTemplate({
                fullName: data.full_name,
                businessName: data.business_name,
                username: data.username,
                password: randomPassword
            });

            await sendEmail({
                to: data.email,
                subject: 'Welcome to Chlat-POS - Your Account Credentials',
                html,
                text
            });

            logger.info('Tenant credentials email sent', { email: data.email, username: data.username });
        } catch (err: any) {
            // We don't want to fail the whole process if email fails
            logger.error('Failed to send tenant welcome email', {
                email: data.email,
                error: err.message
            });
        }

        return user;
    }

    /**
     * Close a subscription
     */
    static async closeSubscription(id: number, data: { reason: string }) {
        return prisma.subscription.update({
            where: { id },
            data: {
                status: 'CLOSED',
                closeReason: data.reason,
                effectiveCloseDate: new Date(),
            },
            select: {
                status: true,
                effectiveCloseDate: true,
            }
        });
    }

    /**
     * List all SaaS packages
     */
    static async listPackages(): Promise<ListPackagesResponse> {
        const packages = await prisma.package.findMany({
            include: {
                package_features: true
            },
            orderBy: { id: 'asc' }
        });

        return {
            packages: packages.map(pkg => ({
                id: pkg.id,
                name: pkg.name,
                description: pkg.description,
                is_active: pkg.isActive,
                created_at: pkg.createdAt,
                updated_at: pkg.updatedAt
            }))
        };
    }

    /**
     * Get SaaS package by ID with features and plans
     */
    static async getPackageById(id: number): Promise<any> {
        const pkg = await prisma.package.findUnique({
            where: { id },
            include: {
                package_features: true,
            }
        });

        if (!pkg) {
            throw new Error(`Package with ID ${id} not found`);
        }

        return {
            id: pkg.id,
            name: pkg.name,
            description: pkg.description,
            is_active: pkg.isActive,
            features: pkg.package_features.map(f => ({
                feature_code: f.featureCode,
                feature_value: f.featureValue
            })),
            created_at: pkg.createdAt,
        };
    }

    /**
     * Toggle package status: active → inactive / inactive → active
     */
    static async togglePackageStatus(id: number) {
        const pkg = await prisma.package.findUnique({
            where: { id },
            select: { id: true, isActive: true },
        });

        if (!pkg) {
            throw new Error(`Package with ID ${id} not found`);
        }

        const newStatus = !pkg.isActive;

        const updated = await prisma.package.update({
            where: { id },
            data: { isActive: newStatus },
            select: { id: true, name: true, isActive: true, updatedAt: true },
        });

        return {
            id: updated.id,
            name: updated.name,
            is_active: updated.isActive,
            updated_at: updated.updatedAt,
        };
    }

    /**
     * Create a new SaaS package
     */
    static async createPackage(data: CreatePackageRequest): Promise<CreatePackageResponse> {
        const result = await prisma.$transaction(async (tx) => {
            const pkg = await tx.package.create({
                data: {
                    name: data.name,
                    description: data.description,
                    isActive: data.is_active ?? true,
                }
            });

            if (data.features && data.features.length > 0) {
                await tx.packageFeature.createMany({
                    data: data.features.map(f => ({
                        packageId: pkg.id,
                        featureCode: f.feature_code,
                        featureValue: f.feature_value,
                        isEnabled: true
                    }))
                });
            }

            const features = await tx.packageFeature.findMany({
                where: { packageId: pkg.id }
            });

            return { pkg, features };
        });

        return {
            id: result.pkg.id,
            name: result.pkg.name,
            description: result.pkg.description,
            is_active: result.pkg.isActive,
            features: result.features.map(f => ({
                feature_code: f.featureCode,
                feature_value: f.featureValue
            })),
            created_at: result.pkg.createdAt
        };
    }

    /**
     * Update an existing SaaS package
     */
    static async updatePackage(id: number, data: UpdatePackageRequest): Promise<any> {
        const result = await prisma.$transaction(async (tx) => {
            // Check if package exists
            const existing = await tx.package.findUnique({ where: { id } });
            if (!existing) {
                throw new Error(`Package with ID ${id} not found`);
            }

            // Update package basic info
            const pkg = await tx.package.update({
                where: { id },
                data: {
                    name: data.name,
                    description: data.description,
                    isActive: data.is_active,
                }
            });

            // Update features if provided
            if (data.features) {
                // Delete existing features
                await tx.packageFeature.deleteMany({
                    where: { packageId: id }
                });

                // Create new features
                if (data.features.length > 0) {
                    await tx.packageFeature.createMany({
                        data: data.features.map(f => ({
                            packageId: id,
                            featureCode: f.feature_code,
                            featureValue: f.feature_value ?? "",
                            isEnabled: true
                        }))
                    });
                }
            }

            const features = await tx.packageFeature.findMany({
                where: { packageId: id }
            });

            return { pkg, features };
        });

        return {
            id: result.pkg.id,
            name: result.pkg.name,
            description: result.pkg.description,
            is_active: result.pkg.isActive,
            features: result.features.map(f => ({
                feature_code: f.featureCode,
                feature_value: f.featureValue
            })),
            created_at: result.pkg.createdAt,
            updated_at: result.pkg.updatedAt
        };
    }

    /**
     * List all SaaS plans
     */
    static async listPlans(): Promise<ListPlansResponse> {
        const plans = await prisma.plan.findMany({
            include: {
                package: true
            },
            orderBy: { id: 'asc' }
        });

        return {
            plans: plans.map((p: any) => ({
                id: p.id,
                package_id: p.packageId,
                package_name: p.package.name,
                plan_type: p.type,
                name: p.name,
                price: Number(p.price),
                duration_days: p.type === PlanType.MONTHLY ? 30 : 365,
                is_active: p.isActive,
                created_at: p.createdAt,
                updated_at: p.updatedAt,
            }))
        };
    }

    /**
     * Get a SaaS plan by ID
     */
    static async getPlanById(id: number): Promise<PlanDetailResponse> {
        const plan = await prisma.plan.findUnique({
            where: { id },
            include: {
                package: {
                    include: {
                        package_features: true
                    }
                }
            }
        });

        if (!plan) {
            throw new Error(`Plan with ID ${id} not found`);
        }

        const [totalSubscriptions, activeSubscriptions] = await Promise.all([
            prisma.subscription.count({ where: { planId: id } }),
            prisma.subscription.count({ where: { planId: id, status: 'ACTIVE' } })
        ]);

        return {
            id: plan.id,
            package_id: plan.packageId,
            package_name: plan.package.name,
            package_description: plan.package.description,
            plan_type: plan.type,
            name: plan.name,
            price: Number(plan.price),
            duration_days: plan.type === PlanType.MONTHLY ? 30 : 365,
            is_active: plan.isActive,
            created_at: plan.createdAt,
            updated_at: plan.updatedAt,
            features: plan.package.package_features.map((f: any) => ({
                feature_code: f.featureCode,
                feature_value: f.featureValue
            })),
            stats: {
                total_subscriptions: totalSubscriptions,
                active_subscriptions: activeSubscriptions
            }
        };
    }

    /**
     * Create a new SaaS plan
     */
    static async createPlan(data: CreatePlanRequest): Promise<CreatePlanResponse> {
        const plan = await prisma.plan.create({
            data: {
                name: data.plan_name,
                packageId: data.package_id,
                type: data.plan_type,
                price: data.price,
            }
        });

        return {
            id: plan.id,
            plan_name: plan.name,
            package_id: plan.packageId,
            plan_type: plan.type,
            price: Number(plan.price),
            is_active: plan.isActive,
            created_at: plan.createdAt
        };
    }

    /**
     * Update an existing SaaS plan
     */
    static async updatePlan(id: number, data: UpdatePlanRequest): Promise<UpdatePlanResponse> {
        const existing = await prisma.plan.findUnique({ where: { id } });
        if (!existing) {
            throw new Error(`Plan with ID ${id} not found`);
        }

        const updated = await prisma.plan.update({
            where: { id },
            data: {
                ...(data.plan_name !== undefined && { name: data.plan_name }),
                ...(data.package_id !== undefined && { packageId: data.package_id }),
                ...(data.plan_type !== undefined && { type: data.plan_type }),
                ...(data.price !== undefined && { price: data.price }),
                ...(data.is_active !== undefined && { isActive: data.is_active }),
            },
        });

        return {
            id: updated.id,
            plan_name: updated.name,
            package_id: updated.packageId,
            plan_type: updated.type,
            price: Number(updated.price),
            is_active: updated.isActive,
            created_at: updated.createdAt,
            updated_at: updated.updatedAt,
        };
    }

    /**
     * Toggle plan status: active → inactive / inactive → active
     */
    static async togglePlanStatus(id: number) {
        const plan = await prisma.plan.findUnique({
            where: { id },
            select: { id: true, isActive: true },
        });

        if (!plan) {
            throw new Error(`Plan with ID ${id} not found`);
        }

        const newStatus = !plan.isActive;

        const updated = await prisma.plan.update({
            where: { id },
            data: { isActive: newStatus },
            select: { id: true, name: true, isActive: true, updatedAt: true },
        });

        return {
            id: updated.id,
            name: updated.name,
            is_active: updated.isActive,
            updated_at: updated.updatedAt,
        };
    }

    /**
     * List all subscription payments
     */
    static async listPayments(params: any): Promise<any> {
        const { page = 1, limit = 10, status, payment_method, search } = params;
        const skip = (Number(page) - 1) * Number(limit);

        const where: any = {};
        if (status) where.status = { equals: status, mode: 'insensitive' };
        if (payment_method) where.paymentMethod = { equals: payment_method, mode: 'insensitive' };

        if (search) {
            where.subscription = {
                user: {
                    OR: [
                        { businessName: { contains: search, mode: 'insensitive' } },
                        { username: { contains: search, mode: 'insensitive' } },
                    ]
                }
            };
        }

        const [payments, total, summaryData, pendingCount] = await Promise.all([
            prisma.subscriptionPayment.findMany({
                where,
                include: {
                    subscription: {
                        include: {
                            plan: {
                                include: {
                                    package: true
                                }
                            },
                            user: true
                        }
                    }
                },
                skip,
                take: Number(limit),
                orderBy: { paymentDate: 'desc' }
            }),
            prisma.subscriptionPayment.count({ where }),
            prisma.subscriptionPayment.aggregate({
                _sum: { amount: true },
                where: { status: 'COMPLETED' }
            }),
            prisma.subscriptionPayment.count({
                where: { status: 'PENDING' }
            }),
        ]);

        return {
            payments: payments.map((p: any) => ({
                id: p.id,
                paid_at: p.paymentDate,
                tenant_name: p.subscription.user.businessName || p.subscription.user.fullName,
                plan_name: p.subscription.plan.name,
                package_name: p.subscription.plan.package.name,
                amount: Number(p.amount),
                currency: 'USD', // Mapping default if not in DB
                payment_method: p.paymentMethod,
                status: p.status,
                transaction_ref: p.transactionId,
                business_name: p.subscription.user.businessName,
                username: p.subscription.user.username,
                tenant_id: p.subscription.tenantId,
            })),
            summary: {
                total_revenue: Number(summaryData._sum.amount || 0),
                pending_count: pendingCount,
                total
            },
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            }
        };
    }

    /**
     * Upgrade a subscription plan
     */
    static async upgradeSubscription(id: number, data: UpgradePlanRequest): Promise<UpgradePlanResponse> {
        return prisma.$transaction(async (tx) => {
            // Find the targeted plan
            const plan = await tx.plan.findFirst({
                where: {
                    packageId: data.package_id,
                    type: data.plan_type
                }
            });

            if (!plan) {
                throw new Error(`Plan not found for package ID ${data.package_id} and type ${data.plan_type}`);
            }

            // Update subscription
            const updatedSubscription = await tx.subscription.update({
                where: { id },
                data: {
                    planId: plan.id,
                    status: 'ACTIVE',
                    startDate: new Date(data.start_date),
                    endDate: new Date(data.end_date),
                    updatedAt: new Date()
                },
                include: {
                    plan: true
                }
            });

            return {
                tenant_id: updatedSubscription.tenantId,
                new_plan: updatedSubscription.plan.name,
                status: updatedSubscription.status,
                start_date: updatedSubscription.startDate,
                end_date: updatedSubscription.endDate
            };
        });
    }

    /**
     * Renew a subscription
     */
    static async renewSubscription(id: number, data: RenewSubscriptionRequest): Promise<RenewSubscriptionResponse> {
        const updatedSubscription = await prisma.subscription.update({
            where: { id },
            data: {
                status: 'ACTIVE',
                startDate: new Date(data.start_date),
                endDate: new Date(data.end_date),
                updatedAt: new Date()
            },
            include: {
                plan: true
            }
        });

        return {
            plan_id: updatedSubscription.planId,
            plan_type: updatedSubscription.plan.type,
            start_date: updatedSubscription.startDate,
            end_date: updatedSubscription.endDate
        };
    }
}


