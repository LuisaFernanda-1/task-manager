import type { Request, Response } from 'express';
import { getAuthUser } from '../api/middlewares/authenticate';
import type { ListTasksQuery } from '../api/schemas/task.schemas';
import type { CreateTaskData, TaskFilters } from '../models/task';
import type { ReplaceTaskInput, TaskService, UpdateTaskInput } from '../services/task.service';

type TaskParams = { id: string };

/**
 * Atiende el CRUD de tareas. El id del usuario siempre sale del token
 * (`req.user`), nunca del cuerpo ni de la URL, para que nadie pueda operar
 * sobre tareas de otra persona cambiando un parámetro.
 */
export class TaskController {
  constructor(private readonly tasks: TaskService) {}

  /** POST /tasks → 201 con la tarea creada. */
  create = async (req: Request, res: Response): Promise<void> => {
    const user = getAuthUser(req);
    const task = await this.tasks.create(user.id, req.body as CreateTaskData);
    res.status(201).json(task);
  };

  /**
   * GET /tasks → 200 con las tareas del usuario. Acepta `?estado=` y `?vencidas=true|false`.
   * `vencidas` llega como texto en la query y aquí se convierte a booleano.
   */
  list = async (req: Request, res: Response): Promise<void> => {
    const user = getAuthUser(req);
    const query = req.query as ListTasksQuery;
    const filters: TaskFilters = { estado: query.estado };
    if (query.vencidas !== undefined) filters.vencidas = query.vencidas === 'true';
    const tasks = await this.tasks.list(user.id, filters);
    res.status(200).json(tasks);
  };

  /** GET /tasks/:id → 200 con la tarea, o 404 si no existe o no es del usuario. */
  getById = async (req: Request<TaskParams>, res: Response): Promise<void> => {
    const user = getAuthUser(req);
    const task = await this.tasks.getById(user.id, req.params.id);
    res.status(200).json(task);
  };

  /** PUT /tasks/:id → 200 con la tarea reemplazada. */
  replace = async (req: Request<TaskParams>, res: Response): Promise<void> => {
    const user = getAuthUser(req);
    const task = await this.tasks.replace(user.id, req.params.id, req.body as ReplaceTaskInput);
    res.status(200).json(task);
  };

  /** PATCH /tasks/:id → 200 con la tarea actualizada, o 404 si no existe o no es del usuario. */
  update = async (req: Request<TaskParams>, res: Response): Promise<void> => {
    const user = getAuthUser(req);
    const task = await this.tasks.update(user.id, req.params.id, req.body as UpdateTaskInput);
    res.status(200).json(task);
  };

  /** DELETE /tasks/:id → 204 sin contenido. */
  delete = async (req: Request<TaskParams>, res: Response): Promise<void> => {
    const user = getAuthUser(req);
    await this.tasks.delete(user.id, req.params.id);
    res.status(204).send();
  };
}
