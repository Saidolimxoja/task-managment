import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Knex } from 'knex';

import { KnexService } from 'src/database/knex.service';

interface CreateCommentDto {
  content: string;
  parentCommentId?: string; // Для вложенных комментариев
}

interface UpdateCommentDto {
  content: string;
}

@Injectable()
export class CommentsService {
  constructor(private readonly knexService: KnexService) {}

  private get knex(): Knex {
    return this.knexService.knex;
  }


  // ================================
  // 1. Получить все комментарии задачи
  // ================================
  async getTaskComments(taskId: string, user: any) {
    // Проверяем существование задачи и доступ
    const task = await this.knex('tasks').where('id', taskId).first();

    if (!task) {
      throw new NotFoundException('Задача не найдена');
    }

    // Проверяем доступ к проекту задачи
    await this.checkProjectAccess(task.project_id, user.id);

    // Получаем комментарии с информацией об авторах
    const comments = await this.knex('comments as c')
      .select(
        'c.id',
        'c.content',
        'c.task_id',
        'c.parent_comment_id',
        'c.created_at',
        'c.updated_at',
        'u.id as author_id',
        'u.full_name as author_name',
        'u.email as author_email',
      )
      .leftJoin('users as u', 'c.author_id', 'u.id')
      .where('c.task_id', taskId)
      .orderBy('c.created_at', 'asc');

    // Группируем комментарии (основные и вложенные)
    const rootComments = comments.filter(c => !c.parent_comment_id);
    const repliesMap = this.groupReplies(comments);

    const formattedComments = rootComments.map(comment => ({
      ...this.formatComment(comment),
      replies: (repliesMap.get(comment.id) || []).map(this.formatComment),
    }));

    return {
      success: true,
      message: comments.length
        ? 'Комментарии получены'
        : 'Комментариев пока нет',
      total: comments.length,
      comments: formattedComments,
    };
  }

  // ================================
  // 2. Добавить комментарий
  // ================================
  async createComment(taskId: string, dto: CreateCommentDto, user: any) {
    // Проверка роли - VIEWER не может комментировать
    if (user.role === 'VIEWER') {
      throw new ForbiddenException('Наблюдатели не могут оставлять комментарии');
    }

    // Проверяем существование задачи
    const task = await this.knex('tasks').where('id', taskId).first();

    if (!task) {
      throw new NotFoundException('Задача не найдена');
    }

    // Проверяем доступ к проекту
    await this.checkProjectAccess(task.project_id, user.id);

    // Если это ответ на комментарий - проверяем parent
    if (dto.parentCommentId) {
      const parentComment = await this.knex('comments')
        .where('id', dto.parentCommentId)
        .andWhere('task_id', taskId)
        .first();

      if (!parentComment) {
        throw new BadRequestException(
          'Родительский комментарий не найден или принадлежит другой задаче',
        );
      }
    }

    // Валидация контента
    if (!dto.content || dto.content.trim().length === 0) {
      throw new BadRequestException('Комментарий не может быть пустым');
    }

    if (dto.content.length > 5000) {
      throw new BadRequestException(
        'Комментарий не может быть длиннее 5000 символов',
      );
    }

    const trx = await this.knex.transaction();

    try {
      // 1. Создаём комментарий
      const [comment] = await trx('comments')
        .insert({
          id: this.knex.raw('gen_random_uuid()'),
          task_id: taskId,
          author_id: user.id,
          content: dto.content.trim(),
          parent_comment_id: dto.parentCommentId || null,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('*');

      await trx.commit();

      return {
        success: true,
        message: 'Комментарий добавлен',
        comment: await this.getCommentById(comment.id),
      };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  // ================================
  // 3. Редактировать комментарий
  // ================================
  async updateComment(commentId: string, dto: UpdateCommentDto, user: any) {
    const comment = await this.knex('comments').where('id', commentId).first();

    if (!comment) {
      throw new NotFoundException('Комментарий не найден');
    }

    // Проверяем права: только автор или ADMIN
    const canEdit = user.role === 'ADMIN' || comment.author_id === user.id;

    if (!canEdit) {
      throw new ForbiddenException(
        'Только автор комментария или администратор могут его редактировать',
      );
    }

    // Валидация контента
    if (!dto.content || dto.content.trim().length === 0) {
      throw new BadRequestException('Комментарий не может быть пустым');
    }

    if (dto.content.length > 5000) {
      throw new BadRequestException(
        'Комментарий не может быть длиннее 5000 символов',
      );
    }

    // Проверяем, что комментарий не старше 24 часов (опционально)
    const hoursSinceCreation =
      (Date.now() - new Date(comment.created_at).getTime()) / (1000 * 60 * 60);

    if (hoursSinceCreation > 24 && user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Нельзя редактировать комментарии старше 24 часов',
      );
    }

    await this.knex('comments')
      .where('id', commentId)
      .update({
        content: dto.content.trim(),
        updated_at: new Date(),
      });

    return {
      success: true,
      message: 'Комментарий обновлён',
      comment: await this.getCommentById(commentId),
    };
  }

  // ================================
  // 4. Удалить комментарий
  // ================================
  async deleteComment(commentId: string, user: any) {
    const comment = await this.knex('comments').where('id', commentId).first();

    if (!comment) {
      throw new NotFoundException('Комментарий не найден');
    }

    // Проверяем права: только автор или ADMIN
    const canDelete = user.role === 'ADMIN' || comment.author_id === user.id;

    if (!canDelete) {
      throw new ForbiddenException(
        'Только автор комментария или администратор могут его удалить',
      );
    }

    const trx = await this.knex.transaction();

    try {

        await trx('comments').where('id', commentId).delete();
      

      await trx.commit();

      return {
        success: true,
        message: 'Комментарий удалён',
      };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  // ================================
  // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
  // ================================

  /**
   * Проверка доступа к проекту
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
   * Получить комментарий по ID с полными деталями
   */
  private async getCommentById(commentId: string) {
    const comment = await this.knex('comments as c')
      .select(
        'c.*',
        'u.full_name as author_name',
        'u.email as author_email',
      )
      .leftJoin('users as u', 'c.author_id', 'u.id')
      .where('c.id', commentId)
      .first();

    return this.formatComment(comment);
  }

  /**
   * Форматирование комментария
   */
  private formatComment(comment: any) {
    // Проверяем является ли комментарий удалённым
    const isDeleted = comment.content === '[Комментарий удалён]';
    
    // Проверяем был ли комментарий отредактирован
    const isEdited = 
      comment.created_at && 
      comment.updated_at && 
      new Date(comment.updated_at).getTime() - new Date(comment.created_at).getTime() > 1000;

    return {
      id: comment.id,
      content: comment.content,
      taskId: comment.task_id,
      parentCommentId: comment.parent_comment_id,
      isEdited: isEdited && !isDeleted,
      isDeleted: isDeleted,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      author: {
        id: comment.author_id,
        name: comment.author_name,
        email: comment.author_email,
      },
    };
  }

  /**
   * Группировка ответов на комментарии
   */
  private groupReplies(comments: any[]): Map<string, any[]> {
    const repliesMap = new Map<string, any[]>();

    for (const comment of comments) {
      if (comment.parent_comment_id) {
        const existing = repliesMap.get(comment.parent_comment_id) || [];
        existing.push(comment);
        repliesMap.set(comment.parent_comment_id, existing);
      }
    }

    return repliesMap;
  }
}