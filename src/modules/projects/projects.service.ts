import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { Knex } from 'knex';
import { KnexService } from 'src/database/knex.service';
import { Role } from 'src/common/enums/role.enum';
import { ProjectStatus } from 'src/common/enums/project-status.enum';

@Injectable()
export class ProjectsService {
  constructor(private readonly knexService: KnexService) {}

  private get knex(): Knex {
    return this.knexService.knex;
  }

  private async removeMemberById(memberId: string) {
    await this.knex('project_members').where({ id: memberId }).del();
  }

  async getAllProjects(userId: string, userRole: string) {
    // Базовый запрос с подсчетами
    let query = this.knex('projects as p')
      .select(
        'p.id',
        'p.name',
        'p.description',
        'p.code',
        'p.owner_id as ownerId',
        'p.status',
        'p.start_date as startDate',
        'p.end_date as endDate',
        'p.created_at as createdAt',
        'p.updated_at as updatedAt',
        'owner.full_name as ownerName',
        'owner.email as ownerEmail',
        this.knex.raw('COUNT(DISTINCT pm.user_id) as "membersCount"'),
        this.knex.raw('COALESCE(COUNT(DISTINCT t.id), 0) as "tasksCount"'),
      )
      .leftJoin('users as owner', 'p.owner_id', 'owner.id')
      .leftJoin('project_members as pm', 'p.id', 'pm.project_id')
      .leftJoin('tasks as t', 'p.id', 't.project_id')
      .groupBy(
        'p.id',
        'p.name',
        'p.description',
        'p.code',
        'p.owner_id',
        'p.status',
        'p.start_date',
        'p.end_date',
        'p.created_at',
        'p.updated_at',
        'owner.full_name',
        'owner.email',
      );

    // Фильтрация по роли
    if (userRole !== 'ADMIN') {
      query = query.where(function () {
        this.where('p.owner_id', userId).orWhereExists(function () {
          this.select('*')
            .from('project_members as pm2')
            .whereRaw('pm2.project_id = p.id')
            .andWhere('pm2.user_id', userId);
        });
      });
    }

    const projects = await query;

    return {
      success: true,
      data: {
        projects,
        total: projects.length,
      },
    };
  }

  //CREATE PROJECT
  async createProject(dto: CreateProjectDto, user: { id: string; role: Role }) {
    const [project] = await this.knex('projects')
      .insert({
        name: dto.name,
        description: dto.description ?? null,
        code: dto.code,
        start_date: new Date(),
        end_date: dto.end_date ?? null,
        owner_id: user.id,
      })
      .returning('*');

    return {
      success: true,
      message: 'Проект успешно создан',
      project,
    };
  }

  //ADD MEMBER ONLY (ADMNIN>DIRECTOR>ZAM_DIRECTOR)
  async addMember(projectId: string, userId: string, role: string) {
    const existing = await this.knex('project_members')
      .where({ project_id: projectId, user_id: userId })
      .first();
    if (existing) throw new ConflictException('Пользователь уже участник');

    const record = {
      project_id: projectId,
      user_id: userId,
      role,
      joined_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    };
    await this.knex('project_members').insert(record);
    return { success: true, message: 'Участник добавлен', record };
  }

  async deleteProject(projectId: string, user: any) {
    const project = await this.knex('projects')
      .where({ id: projectId })
      .first();

    if (!project) {
      throw new ForbiddenException('Проект не существует');
    }

    if (project.end_date) {
      throw new ForbiddenException('Проект уже закрыт');
    }
    const isOwner = project.owner_id === user.id;
    const isAdmin = user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Нет прав на удаление проекта');
    }

    // 3. Soft delete
    await this.knex('projects').where({ id: projectId }).update({
      status: ProjectStatus.ARCHIVED,
      end_date: new Date(),
      updated_at: new Date(),
    });

    return {
      success: true,
      message: 'Проект Закрыт',
    };
  }

  async deleteMember(
    projectId: string,
    targetUserId: string,
    currentUser: {
      id: string;
      role: 'ADMIN' | 'DIRECTOR' | 'ZAM_DIRECTOR' | 'EMPLOYEE' | 'VIEWER';
    },
  ) {
    const project = await this.knex('projects')
      .where({ id: projectId })
      .first();

    if (!project) {
      throw new NotFoundException('Проект не найден');
    }

    if (project.owner_id === targetUserId) {
      throw new ForbiddenException('Нельзя удалить владельца проекта');
    }

    const member = await this.knex('project_members')
      .where({
        project_id: projectId,
        user_id: targetUserId,
      })
      .first();

    if (!member) {
      throw new NotFoundException(
        'Пользователь не является участником проекта',
      );
    }

    // 4. ADMIN — всегда можно
    if (currentUser.role === 'ADMIN') {
      await this.removeMemberById(member.id);
      return { success: true, message: 'Участник удалён из проекта' };
    }

    // 5. OWNER проекта (DIRECTOR)
    if (project.owner_id === currentUser.id) {
      await this.removeMemberById(member.id);
      return { success: true, message: 'Участник удалён из проекта' };
    }

    // 6. ZAM_DIRECTOR → ТОЛЬКО если он MANAGER в этом проекте
    if (currentUser.role === 'ZAM_DIRECTOR') {
      const manager = await this.knex('project_members')
        .where({
          project_id: projectId,
          user_id: currentUser.id,
          role: 'MANAGER',
        })
        .first();

      if (!manager) {
        throw new ForbiddenException(
          'Заместитель не является менеджером проекта',
        );
      }

      if (!['MEMBER', 'VIEWER'].includes(member.role)) {
        throw new ForbiddenException(
          'Менеджер может удалять только работников или наблюдателей',
        );
      }

      await this.removeMemberById(member.id);
      return { success: true, message: 'Участник удалён из проекта' };
    }

    throw new ForbiddenException('Недостаточно прав для удаления участника');
  }

  // projects.service.ts

  async getProjectMembers(projectId: string, user: any) {
    // Проверка что projectId валидный UUID
    if (!projectId || projectId === 'undefined') {
      throw new BadRequestException('Некорректный ID проекта');
    }

    // Проверяем существование проекта
    const project = await this.knex('projects').where('id', projectId).first();

    if (!project) {
      throw new NotFoundException('Проект не найден');
    }

    // Проверяем доступ
    const hasAccess = await this.knex('project_members')
      .where({ project_id: projectId, user_id: user.id })
      .first();

    const isOwner = project.owner_id === user.id;

    if (!hasAccess && !isOwner && user.role !== 'ADMIN') {
      throw new ForbiddenException('Нет доступа к этому проекту');
    }

    // Получаем участников
    const members = await this.knex('project_members as pm')
      .select(
        'pm.id',
        'pm.user_id',
        'pm.role',
        'pm.joined_at',
        'u.full_name',
        'u.email',
      )
      .leftJoin('users as u', 'pm.user_id', 'u.id')
      .where('pm.project_id', projectId)
      .orderBy('pm.joined_at', 'asc');

    return {
      success: true,
      members,
      total: members.length,
    };
  }
}
