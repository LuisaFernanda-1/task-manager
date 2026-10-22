import { Router } from 'express';
import type { TaskController } from '../../controllers/task.controller';
import type { TokenService } from '../../services/token.service';
import { authenticate } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import { listTasksQuerySchema, taskBodySchema, taskIdParamsSchema, taskPatchSchema } from '../schemas/task.schemas';

/**
 * Rutas de tareas, montadas en `/tasks`. Todas exigen token:
 * el middleware `authenticate` se aplica una sola vez a todo el router.
 *
 * @param controller Controlador que atiende cada ruta.
 * @param tokens Servicio con el que se verifican los tokens.
 */
export function createTaskRouter(controller: TaskController, tokens: TokenService): Router {
  const router = Router();
  router.use(authenticate(tokens));

  router.post('/', validate({ body: taskBodySchema }), controller.create);
  router.get('/', validate({ query: listTasksQuerySchema }), controller.list);
  router.get('/:id', validate({ params: taskIdParamsSchema }), controller.getById);
  router.put('/:id', validate({ params: taskIdParamsSchema, body: taskBodySchema }), controller.replace);
  router.patch('/:id', validate({ params: taskIdParamsSchema, body: taskPatchSchema }), controller.update);
  router.delete('/:id', validate({ params: taskIdParamsSchema }), controller.delete);

  return router;
}
