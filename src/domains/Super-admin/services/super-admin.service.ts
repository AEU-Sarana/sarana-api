import prisma from '@src/database/client';
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
    ListPaymentsResponse,
    UpgradePlanRequest,
    UpgradePlanResponse,
    RenewSubscriptionRequest,
    RenewSubscriptionResponse,
    ListSubscriptionsResponse,
    UpdateTenantRequest,
    UpdateTenantResponse
} from '../types/V1';


import { GroupByType, PlanType, TenantStatus } from '../enums/V1';

export class SuperAdminService {
    /**
     * Get platform statistics summary
     */
    static async getDashboardSummary(period: string): Promise<DashboardSummaryResponse> {
        // Note: In a real implementation, we would filter by period
        const totalUser = await prisma.user.count();
        const activeTenants = await prisma.user.count({
            where: { role: 'ADMIN', status: 'active' }
        });
        const totalSubscriptions = await prisma.subscription.count();

        // Aggregating subscription overview
        const monthly = await prisma.subscription.count({ where: { plan: { type: PlanType.MONTHLY }, status: 'ACTIVE' } });
        const yearly = await prisma.subscription.count({ where: { plan: { type: PlanType.YEARLY }, status: 'ACTIVE' } });

        return {
            stats: {
                total_user: totalUser,
                total_trail: 0, // Placeholder
                active_tenants: activeTenants,
                total_subscriptions: totalSubscriptions,
            },
            subscriptions_overview: {
                monthly,
                yearly,
                trail: 0,
                expired: 0,
            }
        };
    }

    /**
     * Get user growth data
     */
    static async getUserGrowth(groupBy: GroupByType, year?: number): Promise<UserGrowthResponse> {
        // Simplified placeholder implementation
        return {
            group_by: groupBy,
            year: year,
            labels: groupBy === GroupByType.MONTH ? ['Jan', 'Feb', 'Mar'] : ['2024', '2025', '2026'],
            data: [100, 200, 300],
        };
    }

    /**
     * List all subscriptions with tenant and plan info
     */
    static async listSubscriptions(params: any): Promise<ListSubscriptionsResponse> {
        const { page = 1, limit = 20, status, search } = params;
        const skip = (Number(page) - 1) * Number(limit);

        const where: any = {};
        if (status) where.status = status;
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
                username: s.user.username,
                plan_id: s.planId,
                plan_name: s.plan.name,
                plan_type: s.plan.type,
                plan_price: Number(s.plan.price),
                status: s.status,
                start_date: s.startDate,
                end_date: s.endDate ?? null,
                close_reason: s.closeReason ?? null,
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
     * List all tenants
     */
    static async listTenants(params: any) {
        const { page = 1, limit = 20, status, search } = params;
        const skip = (page - 1) * limit;

        const where: any = {
            role: 'ADMIN',
        };

        if (status) where.status = status;
        if (search) {
            where.OR = [
                { businessName: { contains: search, mode: 'insensitive' } },
                { username: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [tenants, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                include: {
                    subscriptions: {
                        include: { plan: true }
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
                } : null
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
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
            telegram_bot: telegramLink ? {
                telegram_user_id: telegramLink.telegramUserId.toString(),
                chat_id: telegramLink.chatId.toString(),
                status: telegramLink.status,
                linked_at: telegramLink.linkedAt,
                last_seen_at: telegramLink.lastSeenAt,
                revoked_at: telegramLink.revokedAt,
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
                status: data.status,
            }
        });

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
     * Create a new tenant with initial subscription
     */
    static async createTenant(data: CreateTenantRequest) {
        // This would involve a complex transaction:
        // 1. Create User
        // 2. Create Subscription
        // Simplified for now
        return prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    username: data.username,
                    email: data.email,
                    fullName: data.full_name,
                    passwordHash: 'PBKDF2_PLACEHOLDER', // In reality, encrypt password
                    role: 'ADMIN',
                    businessName: data.business_name,
                    address: data.address,
                    phone: data.phone,
                    status: data.status.toLowerCase() as any,
                    endAt: new Date(data.end_time),
                }
            });

            // Find plan
            const plan = await tx.plan.findFirst({
                where: { packageId: data.package_id, type: data.plan_type }
            });

            if (!plan) {
                // If the user requests a non-existent package/plan combo, we should fail the request
                // rather than creating an orphan tenant.
                throw new Error(`Plan not found for package ID ${data.package_id} and type ${data.plan_type}`);
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
                        amount: data.price ?? plan.price,
                        paymentMethod: data.payment_method,
                        transactionId: data.transaction_id,
                        status: 'COMPLETED'
                    }
                });
            }

            return user;
        });
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
            orderBy: { id: 'asc' }
        });

        return {
            packages: packages.map(pkg => ({
                id: pkg.id,
                name: pkg.name,
                description: pkg.description,
                is_active: pkg.isActive,
                created_at: pkg.createdAt,
            }))
        };
    }

    /**
     * Create a new SaaS package
     */
    static async createPackage(data: CreatePackageRequest): Promise<CreatePackageResponse> {
        const pkg = await prisma.package.create({
            data: {
                name: data.name,
                description: data.description,
                isActive: data.is_active ?? true,
            },
            select: {
                id: true,
                name: true,
                description: true,
                isActive: true,
                createdAt: true
            }
        });
        return { id: pkg.id, name: pkg.name, description: pkg.description, is_active: pkg.isActive, created_at: pkg.createdAt };
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
                package_name: p.package.name,
                plan_type: p.type,
                name: p.name,
                price: Number(p.price),
                duration_days: p.type === PlanType.MONTHLY ? 30 : 365,
            }))
        };
    }

    /**
     * Create a new SaaS plan
     */
    static async createPlan(data: CreatePlanRequest): Promise<CreatePlanResponse> {
        return prisma.$transaction(async (tx) => {
            const plan = await tx.plan.create({
                data: {
                    name: data.plan_name,
                    packageId: data.package_id,
                    type: data.plan_type,
                    price: data.price,
                }
            });

            let feature = null;
            if (data.feature_code) {
                feature = await tx.packageFeature.create({
                    data: {
                        packageId: data.package_id,
                        featureCode: data.feature_code,
                        featureValue: data.feature_value,
                        isEnabled: true
                    }
                });
            }

            return {
                id: plan.id,
                plan_name: plan.name,
                package_id: plan.packageId,
                plan_type: plan.type,
                price: Number(plan.price),
                feature_code: feature?.featureCode,
                feature_value: feature?.featureValue,
                created_at: plan.createdAt
            };
        });
    }

    /**
     * List all subscription payments
     */
    static async listPayments(): Promise<ListPaymentsResponse> {
        const [payments, summaryData] = await Promise.all([
            prisma.subscriptionPayment.findMany({
                include: {
                    subscription: {
                        include: {
                            plan: true,
                            user: true
                        }
                    }
                },
                orderBy: { paymentDate: 'desc' }
            }),
            prisma.subscriptionPayment.aggregate({
                _sum: {
                    amount: true
                },
                where: {
                    status: 'COMPLETED'
                }
            }),
        ]);

        const pendingCount = await prisma.subscriptionPayment.count({
            where: {
                status: 'PENDING'
            }
        });

        return {
            payments: payments.map((p: any) => ({
                id: p.id,
                paid_at: p.paymentDate,
                tenant_name: p.subscription.user.businessName || p.subscription.user.fullName,
                plan_name: p.subscription.plan.name,
                amount: Number(p.amount),
                payment_method: p.paymentMethod,
                status: p.status,
            })),
            summary: {
                total_revenue: Number(summaryData._sum.amount || 0),
                pending_count: pendingCount
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


