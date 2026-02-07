import { Request, Response } from 'express';
import { AuthService } from '@src/domains/Auth/services/V2/auth.service';

const service = new AuthService();

export class AuthV2Controller {
  async login(req: Request, res: Response): Promise<void> {
    const data = await service.login({
      ...req.body,
      ip: req.ip,
      user_agent: req.headers['user-agent'] as string | undefined,
    });

    res.status(200).json({
      success: true,
      data,
      message: 'Login successful',
    });
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const data = await service.refresh({
      ...req.body,
      ip: req.ip,
      user_agent: req.headers['user-agent'] as string | undefined,
    });

    res.status(200).json({
      success: true,
      data,
      message: 'Token refreshed successfully',
    });
  }

  async logout(req: Request, res: Response): Promise<void> {
    const data = await service.logout(req.body);

    res.status(200).json({
      success: true,
      data,
      message: 'Logout successful',
    });
  }

  async logoutAll(req: Request, res: Response): Promise<void> {
    const userId = (req.user as { userId: number }).userId;
    const data = await service.logoutAll(userId);

    res.status(200).json({
      success: true,
      data,
      message: 'Logout all successful',
    });
  }

  async me(req: Request, res: Response): Promise<void> {
    const userId = (req.user as { userId: number }).userId;
    const data = await service.me(userId);

    res.status(200).json({
      success: true,
      data,
      message: 'Current user retrieved',
    });
  }
}
