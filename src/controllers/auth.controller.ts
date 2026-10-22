import type { Request, Response } from 'express';
import type { AuthService, LoginInput, RegisterInput } from '../services/auth.service';

/**
 * Atiende las peticiones de autenticación. Solo traduce HTTP ⇄ servicio:
 * lee el cuerpo ya validado, llama al servicio y elige el código de respuesta.
 */
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** POST /auth/register → 201 con el usuario creado (sin contraseña). */
  register = async (req: Request, res: Response): Promise<void> => {
    const user = await this.auth.register(req.body as RegisterInput);
    res.status(201).json(user);
  };

  /** POST /auth/login → 200 con el token JWT. */
  login = async (req: Request, res: Response): Promise<void> => {
    const result = await this.auth.login(req.body as LoginInput);
    res.status(200).json(result);
  };
}
