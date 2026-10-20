import type { Request, Response } from 'express';
import type { AuthService, LoginInput, RegisterInput } from '../services/auth.service';

export class AuthController {
  constructor(private readonly auth: AuthService) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const user = await this.auth.register(req.body as RegisterInput);
    res.status(201).json(user);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const result = await this.auth.login(req.body as LoginInput);
    res.status(200).json(result);
  };
}
