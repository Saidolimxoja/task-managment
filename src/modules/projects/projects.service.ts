import {
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { Knex } from 'knex';
import { KnexService } from 'src/database/knex.service';
import { Role } from 'src/common/enums/role.enum';

@Injectable()
export class ProjectsService {
  constructor(private readonly knexService: KnexService) {}

  private get knex(): Knex {
    return this.knexService.knex;
  }

  async getAllProjects(userId: string) {
    const projects = await this.knex('projects as p')
      .select(
        'p.*',
        'u.email as creator_email',
        'u.full_name as creator_name',
        this.knex.raw(
          `
        CASE
          WHEN p.owner_id  = ? THEN 'OWNER'
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
      .leftJoin('users as u', 'p.owner_id ', 'u.id')
      .leftJoin('project_members as pm', function () {
        this.on('pm.project_id', '=', 'p.id').andOnVal(
          'pm.user_id',
          '=',
          userId,
        );
      })
      .where(function () {
        this.where('p.owner_id ', userId).orWhere('pm.user_id', userId);
      })
      .orderBy('p.created_at', 'desc');

    console.log(projects);
    return {
      success: true,
      message: projects.length
        ? 'Проекты успешно получены'
        : 'У вас пока нет проектов',
      projects: projects.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        status: p.status,
        user_role: p.user_role,
        task_count: Number(p.task_count) || 0,
        completed_tasks: Number(p.completed_tasks) || 0,
        owner_details: {
          full_name: p.creator_name,
        },
        created_at: p.created_at,
        updated_at: p.updated_at,
      })),
      total: projects.length,
    };
  }

  async createProject(dto: CreateProjectDto, user: { id: string; role: Role }) {
    // 🧠 2. Создание проекта
    const [project] = await this.knex('projects')
      .insert({
        name: dto.name,
        description: dto.description ?? null,
        code: dto.code,
        start_date: dto.start_date ?? null,
        end_date: dto.end_date ?? null,
        owner_id: user.id,
      })
      .returning('*');

    // ✅ 3. Возврат
    return {
      success: true,
      message: 'Проект успешно создан',
      project,
    };
  }

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
}
