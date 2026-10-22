/** Usuario tal como se guarda en la base de datos. Incluye el hash de la contraseña. */
export interface User {
  id: string;
  nombre: string;
  email: string;
  password_hash: string;
  creado_en: Date;
}

/** Representación pública del usuario: nunca incluye el hash de la contraseña. */
export type PublicUser = Omit<User, 'password_hash'>;

/** Datos necesarios para crear un usuario en la base de datos. */
export interface CreateUserData {
  nombre: string;
  email: string;
  passwordHash: string;
}

/**
 * Quita los campos sensibles de un usuario antes de enviarlo al cliente.
 * @param user Usuario completo leído de la base de datos.
 */
export function toPublicUser(user: User): PublicUser {
  const { password_hash: _omitted, ...publicUser } = user;
  return publicUser;
}
