import type { Request, Response } from 'express';
import { getAuthUser } from '../api/middlewares/authenticate';
import type { ListTasksQuery } from '../api/schemas/task.schemas';
import type { CreateTaskData, TaskFilters } from '../models/task';
import type { ReplaceTaskInput, TaskService, UpdateTaskInput } from '../services/task.service';

type TaskParams = { id: string };

export class TaskController {
  constructor(private readonly tasks: TaskService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const user = getAuthUser(req);
    const task = await this.tasks.create(user.id, req.body as CreateTaskData);
    res.status(201).json(task);
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const user = getAuthUser(req);
    const query = req.query as ListTasksQuery;
    const filters: TaskFilters = { estado: query.estado };
    if (query.vencidas !== undefined) filters.vencidas = query.vencidas === 'true';
    const tasks = await this.tasks.list(user.id, filters);
    res.status(200).json(tasks);
  };

  getById = async (req: Request<TaskParams>, res: Response): Promise<void> => {
    const user = getAuthUser(req);
    const task = await this.tasks.getById(user.id, req.params.id);
    res.status(200).json(task);
  };

  replace = async (req: Request<TaskParams>, res: Response): Promise<void> => {
    const user = getAuthUser(req);
    const task = await this.tasks.replace(user.id, req.params.id, req.body as ReplaceTaskInput);
    res.status(200).json(task);
  };

  update = async (req: Request<TaskParams>, res: Response): Promise<void> => {
    const user = getAuthUser(req);
    const task = await this.tasks.update(user.id, req.params.id, req.body as UpdateTaskInput);
    res.status(200).json(task);
  };

  delete = async (req: Request<TaskParams>, res: Response): Promise<void> => {
    const user = getAuthUser(req);
    await this.tasks.delete(user.id, req.params.id);
    res.status(204).send();
  };
}
