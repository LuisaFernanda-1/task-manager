import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '../../src/errors';
import type { Task } from '../../src/models/task';
import type { TaskRepository } from '../../src/persistence/task.repository';
import { TaskService } from '../../src/services/task.service';

const sampleTask: Task = {
  id: 'task-1',
  usuario_id: 'user-1',
  titulo: 'Tarea',
  descripcion: null,
  fecha_vencimiento: null,
  estado: 'pendiente',
  creado_en: new Date(),
  actualizado_en: new Date(),
};

function mockRepository(): TaskRepository {
  return {
    create: vi.fn().mockResolvedValue(sampleTask),
    findAllByUser: vi.fn().mockResolvedValue([sampleTask]),
    findByIdForUser: vi.fn().mockResolvedValue(sampleTask),
    replaceForUser: vi.fn().mockResolvedValue(sampleTask),
    updateForUser: vi.fn().mockResolvedValue(sampleTask),
    deleteForUser: vi.fn().mockResolvedValue(true),
  };
}

describe('TaskService', () => {
  let repo: TaskRepository;
  let service: TaskService;

  beforeEach(() => {
    repo = mockRepository();
    service = new TaskService(repo);
  });

  it('crea la tarea con valores por defecto y textos sin espacios sobrantes', async () => {
    await service.create('user-1', { titulo: '  Estudiar  ', descripcion: '   ' });
    expect(repo.create).toHaveBeenCalledWith('user-1', {
      titulo: 'Estudiar',
      descripcion: null,
      fecha_vencimiento: null,
      estado: 'pendiente',
    });
  });

  it('busca siempre filtrando por el dueño', async () => {
    await service.getById('user-1', 'task-1');
    expect(repo.findByIdForUser).toHaveBeenCalledWith('task-1', 'user-1');
  });

  it('lanza NotFoundError si la tarea no existe o es de otro usuario', async () => {
    vi.mocked(repo.findByIdForUser).mockResolvedValue(null);
    await expect(service.getById('user-2', 'task-1')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('PUT reemplaza: los campos omitidos vuelven a su valor por defecto', async () => {
    await service.replace('user-1', 'task-1', { titulo: 'Nuevo' });
    expect(repo.replaceForUser).toHaveBeenCalledWith('task-1', 'user-1', {
      titulo: 'Nuevo',
      descripcion: null,
      fecha_vencimiento: null,
      estado: 'pendiente',
    });
  });

  it('lanza NotFoundError al reemplazar una tarea inexistente', async () => {
    vi.mocked(repo.replaceForUser).mockResolvedValue(null);
    await expect(service.replace('user-1', 'x', { titulo: 'a' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('PATCH envía al repositorio solo los campos recibidos', async () => {
    await service.update('user-1', 'task-1', { titulo: '  Nuevo  ', descripcion: null });
    expect(repo.updateForUser).toHaveBeenCalledWith('task-1', 'user-1', { titulo: 'Nuevo', descripcion: null });
  });

  it('lanza NotFoundError al actualizar una tarea inexistente', async () => {
    vi.mocked(repo.updateForUser).mockResolvedValue(null);
    await expect(service.update('user-1', 'x', { estado: 'completada' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('lanza NotFoundError al borrar una tarea inexistente', async () => {
    vi.mocked(repo.deleteForUser).mockResolvedValue(false);
    await expect(service.delete('user-1', 'x')).rejects.toBeInstanceOf(NotFoundError);
  });
});
