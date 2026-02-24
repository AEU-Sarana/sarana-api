import prisma from '@src/database/client';
import {
    DashboardSummaryResponse,
    UserGrowthResponse,
    CreateTenantRequest
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
}
