import {
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
    // 1. Получаем проекты пользователя
    const projects = await this.knex('projects as p')
      .select(
        'p.*',
        'u.email as creator_email',
        'u.full_name as creator_name',
        this.knex.raw(
          `
        CASE
          WHEN p.owner_id = ? THEN 'OWNER'
          WHEN pm.role IS NOT NULL THEN pm.role
          ELSE 'MEMBER'
        END AS user_role
        `,
          [userId],
        ),
        this.knex.raw(
          `(SELECT COUNT(*) FROM tasks WHERE project_id = p.id) AS task_count`,
        ),
        this.knex.raw(
          `(SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'DONE') AS completed_tasks`,
        ),
      )
      .leftJoin('users as u', 'p.owner_id', 'u.id')
      .leftJoin('project_members as pm', function () {
        this.on('pm.project_id', '=', 'p.id').andOnVal(
          'pm.user_id',
          '=',
          userId,
        );
      })
      .whereNull('p.end_date')
      .where(function () {
        this.where('p.owner_id', userId).orWhere('pm.user_id', userId);
      })
      .orderBy('p.created_at', 'desc');

    // 2. Если ADMIN или DIRECTOR - получаем участников
    let membersByProject = new Map();

    if (userRole === 'ADMIN' || userRole === 'DIRECTOR') {
      const projectIds = projects.map((p) => p.id);

      if (projectIds.length > 0) {
        // Один запрос для всех участников всех проектов
        const allMembers = await this.knex('project_members as pm')
          .select(
            'pm.project_id',
            'pm.user_id',
            'pm.role as member_role',
            'pm.joined_at',
            'u.full_name',
            'u.email',
          )
          .leftJoin('users as u', 'pm.user_id', 'u.id')
          .whereIn('pm.project_id', projectIds)
          .orderBy('pm.joined_at', 'asc');

        // Группируем по project_id
        for (const member of allMembers) {
          if (!membersByProject.has(member.project_id)) {
            membersByProject.set(member.project_id, []);
          }
          membersByProject.get(member.project_id).push({
            user_id: member.user_id,
            full_name: member.full_name,
            email: member.email,
            role: member.member_role,
            joined_at: member.joined_at,
          });
        }
      }
    }

    // 3. Формируем ответ
    return {
      success: true,
      message: projects.length
        ? 'Проекты успешно получены'
        : 'У вас пока нет проектов',
      projects: projects.map((p) => {
        const baseProject = {
          id: p.id,
          title: p.title,
          description: p.description,
          status: p.status,
          user_role: p.user_role,
          task_count: Number(p.task_count) || 0,
          completed_tasks: Number(p.completed_tasks) || 0,
          owner_details: {
            full_name: p.creator_name,
            email: p.creator_email,
          },
          created_at: p.created_at,
          updated_at: p.updated_at,
        };

        // Добавляем members только для ADMIN и DIRECTOR
        if (userRole === 'ADMIN' || userRole === 'DIRECTOR') {
          return {
            ...baseProject,
            members: membersByProject.get(p.id) || [],
          };
        }

        return baseProject;
      }),
      total: projects.length,
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
}
