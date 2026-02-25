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
    RenewSubscriptionResponse
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

            await tx.subscription.create({
                data: {
                    tenantId: user.userId,
                    planId: plan.id,
                    status: 'ACTIVE',
                    startDate: new Date(data.start_time),
                    endDate: new Date(data.end_time),
                }
            });

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
            select: { id: true }
        });
        return { id: pkg.id };
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


