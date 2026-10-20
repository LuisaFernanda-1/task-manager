export interface User {
  id: string;
  nombre: string;
  email: string;
  password_hash: string;
  creado_en: Date;
}

export type PublicUser = Omit<User, 'password_hash'>;

export interface CreateUserData {
  nombre: string;
  email: string;
  passwordHash: string;
}

export function toPublicUser(user: User): PublicUser {
  const { password_hash: _omitted, ...publicUser } = user;
  return publicUser;
}
