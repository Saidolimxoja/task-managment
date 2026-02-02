import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Knex } from 'knex';
import { TaskStatus } from 'src/common/enums/task-status.enum';
import { TaskPriority } from 'src/common/enums/task-priority.enum';
import { KnexService } from 'src/database/knex.service';

@Injectable()
export class TasksService {
  constructor(private readonly knexService: KnexService) {}

  private get knex(): Knex {
    return this.knexService.knex;
  }

  // ================================
  // 1. Получить все задачи проекта
  // ================================
  async getAllTasks(projectId: string, user: any) {
    // Проверяем доступ к проекту
    await this.checkProjectAccess(projectId, user.id);

    const tasks = await this.knex('tasks as t')
      .select(
        't.*',
        'creator.full_name as creator_name',
        'creator.email as creator_email',
        'assignee.full_name as assignee_name',
        'assignee.email as assignee_email',
      )
      .leftJoin('users as creator', 't.creator_id', 'creator.id')
      .leftJoin('users as assignee', 't.assignee_id', 'assignee.id')
      .where('t.project_id', projectId)
      .orderBy('t.created_at', 'desc');

    return {
      success: true,
      message: tasks.length ? 'Задачи получены' : 'Задач пока нет',
      total: tasks.length,
      tasks: tasks.map(this.formatTask),
    };
  }

  // ================================
  // 2. Создать задачу
  // ================================
  async createTask(projectId: string, dto: CreateTaskDto, user: any) {
    // Проверяем доступ к проекту
    await this.checkProjectAccess(projectId, user.id);

    // Проверяем, что проект активен
    const project = await this.knex('projects')
      .where('id', projectId)
      .whereNull('end_date')
      .first();

    if (!project) {
      throw new BadRequestException('Проект неактивен или не найден');
    }

    // Если указан assignee - проверяем, что он участник проекта
    if (dto.assigneeId) {
      await this.checkUserInProject(projectId, dto.assigneeId);
    }

    const [task] = await this.knex('tasks')
      .insert({
        id: this.knex.raw('gen_random_uuid()'),
        title: dto.title,
        description: dto.description,
        status: dto.status || TaskStatus.TODO,
        priority: dto.priority || TaskPriority.MEDIUM,
        project_id: projectId,
        creator_id: user.id,
        assignee_id: dto.assigneeId || null,
        deadline: dto.deadline || null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    return {
      success: true,
      message: 'Задача успешно создана',
      task: await this.getTaskWithDetails(task.id),
    };
  }

  // ================================
  // 3. Получить детали задачи
  // ================================
  async getTaskById(taskId: string, user: any) {
    const task = await this.knex('tasks as t')
      .select(
        't.*',
        'creator.full_name as creator_name',
        'creator.email as creator_email',
        'assignee.full_name as assignee_name',
        'assignee.email as assignee_email',
        'p.title as project_title',
      )
      .leftJoin('users as creator', 't.creator_id', 'creator.id')
      .leftJoin('users as assignee', 't.assignee_id', 'assignee.id')
      .leftJoin('projects as p', 't.project_id', 'p.id')
      .where('t.id', taskId)
      .first();

    if (!task) {
      throw new NotFoundException('Задача не найдена');
    }

    // Проверяем доступ к проекту задачи
    await this.checkProjectAccess(task.project_id, user.id);

    return {
      success: true,
      task: this.formatTask(task),
    };
  }

  // ================================
  // 4. Обновить задачу
  // ================================
  async updateTask(taskId: string, dto: UpdateTaskDto, user: any) {
    const task = await this.knex('tasks').where('id', taskId).first();

    if (!task) {
      throw new NotFoundException('Задача не найдена');
    }

    // Проверяем права: creator, assignee или ADMIN
    const canUpdate =
      user.role === 'ADMIN' ||
      task.creator_id === user.id ||
      task.assignee_id === user.id;

    if (!canUpdate) {
      throw new ForbiddenException(
        'Только создатель, исполнитель или администратор могут редактировать задачу',
      );
    }

    // Если меняется assignee - проверяем участника проекта
    if (dto.assigneeId && dto.assigneeId !== task.assignee_id) {
      await this.checkUserInProject(task.project_id, dto.assigneeId);
    }

    const updateData: any = {
      updated_at: new Date(),
    };

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.assigneeId !== undefined) updateData.assignee_id = dto.assigneeId;

    await this.knex('tasks').where('id', taskId).update(updateData);

    return {
      success: true,
      message: 'Задача обновлена',
      task: await this.getTaskWithDetails(taskId),
    };
  }

  // ================================
  // 5. Удалить задачу
  // ================================
  async deleteTask(taskId: string, user: any) {
    const task = await this.knex('tasks').where('id', taskId).first();

    if (!task) {
      throw new NotFoundException('Задача не найдена');
    }

    // Только ADMIN или creator могут удалить
    const canDelete = user.role === 'ADMIN' || task.creator_id === user.id;

    if (!canDelete) {
      throw new ForbiddenException(
        'Только создатель или администратор могут удалить задачу',
      );
    }

    await this.knex('tasks').where('id', taskId).delete();

    return {
      success: true,
      message: 'Задача удалена',
    };
  }

  // ================================
  // 6. Изменить статус задачи
  // ================================
  async changeStatus(taskId: string, status: string, user: any) {
    const task = await this.knex('tasks').where('id', taskId).first();

    if (!task) {
      throw new NotFoundException('Задача не найдена');
    }

    // Проверяем валидность статуса
    if (!Object.values(TaskStatus).includes(status as TaskStatus)) {
      throw new BadRequestException('Некорректный статус задачи');
    }

    // Проверяем права: assignee, ADMIN или ZAM_DIRECTOR
    const canChangeStatus =
      user.role === 'ADMIN' ||
      user.role === 'ZAM_DIRECTOR' ||
      task.assignee_id === user.id;

    if (!canChangeStatus) {
      throw new ForbiddenException(
        'Только исполнитель, заместитель директора или администратор могут менять статус',
      );
    }

    // Запрещаем напрямую ставить DONE или REJECTED (для этого есть approve/reject)
    if (status === TaskStatus.REVIEW || status === TaskStatus.REJECTED) {
      throw new BadRequestException(
        'Используйте эндпоинты /approve или /reject для финального статуса',
      );
    }

    const updateData: any = {
      status,
      updated_at: new Date(),
    };

    await this.knex('tasks').where('id', taskId).update(updateData);

    return {
      success: true,
      message: `Статус изменён на ${status}`,
      task: await this.getTaskWithDetails(taskId),
    };
  }

  // ================================
  // 7. Утвердить задачу → DONE
  // ================================
  async approveTask(taskId: string, user: any) {
    const task = await this.knex('tasks').where('id', taskId).first();

    if (!task) {
      throw new NotFoundException('Задача не найдена');
    }

    // Проверяем, что задача в статусе IN_REVIEW
    if (task.status !== TaskStatus.REVIEW) {
      throw new BadRequestException(
        'Можно утвердить только задачи в статусе IN_REVIEW',
      );
    }

    await this.knex('tasks').where('id', taskId).update({
      status: TaskStatus.APPROVED,
      completed_at: new Date(),
      updated_at: new Date(),
    });

    return {
      success: true,
      message: 'Задача утверждена и завершена',
      task: await this.getTaskWithDetails(taskId),
    };
  }

  // ================================
  // 8. Отклонить задачу → REJECTED
  // ================================
  async rejectTask(taskId: string, user: any) {
    const task = await this.knex('tasks').where('id', taskId).first();

    if (!task) {
      throw new NotFoundException('Задача не найдена');
    }

    // Проверяем, что задача в статусе IN_REVIEW
    if (task.status !== TaskStatus.REVIEW) {
      throw new BadRequestException(
        'Можно отклонить только задачи в статусе IN_REVIEW',
      );
    }

    await this.knex('tasks').where('id', taskId).update({
      status: TaskStatus.REJECTED,
      updated_at: new Date(),
    });

    return {
      success: true,
      message: 'Задача отклонена',
      task: await this.getTaskWithDetails(taskId),
    };
  }

  // ================================
  // 9. Назначить исполнителя
  // ================================
  async assignTask(taskId: string, assigneeId: string, user: any) {
    const task = await this.knex('tasks').where('id', taskId).first();

    if (!task) {
      throw new NotFoundException('Задача не найдена');
    }

    // Проверяем права: creator, ADMIN, ZAM_DIRECTOR, DIRECTOR
    const canAssign =
      user.role === 'ADMIN' ||
      user.role === 'ZAM_DIRECTOR' ||
      user.role === 'DIRECTOR' ||
      task.creator_id === user.id;

    if (!canAssign) {
      throw new ForbiddenException(
        'Недостаточно прав для назначения исполнителя',
      );
    }

    // Проверяем, что assignee является участником проекта
    await this.checkUserInProject(task.project_id, assigneeId);

    await this.knex('tasks').where('id', taskId).update({
      assignee_id: assigneeId,
      updated_at: new Date(),
    });

    return {
      success: true,
      message: 'Исполнитель назначен',
      task: await this.getTaskWithDetails(taskId),
    };
  }

  // ================================
  // 10. Мои назначенные задачи
  // ================================
  async getMyAssignedTasks(user: any) {
    const tasks = await this.knex('tasks as t')
      .select(
        't.*',
        'creator.full_name as creator_name',
        'creator.email as creator_email',
        'p.title as project_title',
      )
      .leftJoin('users as creator', 't.creator_id', 'creator.id')
      .leftJoin('projects as p', 't.project_id', 'p.id')
      .where('t.assignee_id', user.id)
      .orderBy('t.deadline', 'asc')
      .orderBy('t.priority', 'desc');

    return {
      success: true,
      message: tasks.length
        ? 'Ваши задачи получены'
        : 'У вас пока нет назначенных задач',
      total: tasks.length,
      tasks: tasks.map(this.formatTask),
    };
  }

  // ================================
  // 11. Мои созданные задачи
  // ================================
  async getMyCreatedTasks(user: any) {
    const tasks = await this.knex('tasks as t')
      .select(
        't.*',
        'assignee.full_name as assignee_name',
        'assignee.email as assignee_email',
        'p.title as project_title',
      )
      .leftJoin('users as assignee', 't.assignee_id', 'assignee.id')
      .leftJoin('projects as p', 't.project_id', 'p.id')
      .where('t.creator_id', user.id)
      .orderBy('t.created_at', 'desc');

    return {
      success: true,
      message: tasks.length
        ? 'Ваши созданные задачи получены'
        : 'Вы ещё не создали ни одной задачи',
      total: tasks.length,
      tasks: tasks.map(this.formatTask),
    };
  }

  // ================================
  // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
  // ================================

  /**
   * Проверка доступа пользователя к проекту
   */
  private async checkProjectAccess(projectId: string, userId: string) {
    const access = await this.knex('projects as p')
      .select('p.id')
      .leftJoin('project_members as pm', 'pm.project_id', 'p.id')
      .where('p.id', projectId)
      .andWhere(function () {
        this.where('p.owner_id', userId).orWhere('pm.user_id', userId);
      })
      .first();

    if (!access) {
      throw new ForbiddenException('У вас нет доступа к этому проекту');
    }
  }

  /**
   * Проверка, что пользователь является участником проекта
   */
  private async checkUserInProject(projectId: string, userId: string) {
    const isMember = await this.knex('project_members')
      .where('project_id', projectId)
      .andWhere('user_id', userId)
      .first();

    const isOwner = await this.knex('projects')
      .where('id', projectId)
      .andWhere('owner_id', userId)
      .first();

    if (!isMember && !isOwner) {
      throw new BadRequestException(
        'Указанный пользователь не является участником проекта',
      );
    }
  }

  /**
   * Получить задачу с полными деталями
   */
  private async getTaskWithDetails(taskId: string) {
    const task = await this.knex('tasks as t')
      .select(
        't.*',
        'creator.full_name as creator_name',
        'creator.email as creator_email',
        'assignee.full_name as assignee_name',
        'assignee.email as assignee_email',
        'p.title as project_title',
      )
      .leftJoin('users as creator', 't.creator_id', 'creator.id')
      .leftJoin('users as assignee', 't.assignee_id', 'assignee.id')
      .leftJoin('projects as p', 't.project_id', 'p.id')
      .where('t.id', taskId)
      .first();

    return this.formatTask(task);
  }

  /**
   * Форматирование задачи для ответа
   */
  private formatTask(task: any) {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      deadline: task.deadline,
      completed_at: task.completed_at,
      created_at: task.created_at,
      updated_at: task.updated_at,
      project: {
        id: task.project_id,
        title: task.project_title,
      },
      creator: task.creator_name
        ? {
            id: task.creator_id,
            name: task.creator_name,
            email: task.creator_email,
          }
        : null,
      assignee: task.assignee_name
        ? {
            id: task.assignee_id,
            name: task.assignee_name,
            email: task.assignee_email,
          }
        : null,
    };
  }
}
