import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Role } from 'src/common/enums/role.enum';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ProjectMembers } from 'src/common/enums/project-members.enum';
import { AddMembersdto } from './dto/add_members.dto';

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @ApiOperation({
    summary: 'Получить ВСЕХ Своих Проетов',
  })
  @Get()
  GetAllProjects(@CurrentUser() user) {
    return this.projectsService.getAllProjects(user.id, user.role);
  }

  @ApiOperation({
    summary: 'Создать Проект',
  })
  @ApiBearerAuth('access-token')
  @Post()
  create(@Body() createProjectDto: CreateProjectDto, @CurrentUser() user: any) {
    return this.projectsService.createProject(createProjectDto, user);
  }

  @ApiOperation({
    summary: 'Добавить в Проект других пользователей',
  })
  @Post(':id/members')
  @ApiBearerAuth('access-token')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.DIRECTOR, Role.ZAM_DIRECTOR)
  addMember(@Param('id') projectId: string, @Body() dto: AddMembersdto) {
    return this.projectsService.addMember(projectId, dto.userId, dto.role);
  }

  @ApiOperation({
    summary: 'Удалить Проект Только Админ и Директор',
  })
  @Delete(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.ADMIN)
  deleteProject(@Param('id') projectId: string, @CurrentUser() user: any) {
    return this.projectsService.deleteProject(projectId, user);
  }

  @ApiOperation({
    summary: 'Удалить Участника из Проекта',
    description:
      'Доступно для ролей: ADMIN, DIRECTOR (OWNER), ZAM_DIRECTOR (MANAGER)',
  })
  @Delete(':projectId/members/:userId')
  @ApiBearerAuth('access-token')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.DIRECTOR, Role.ZAM_DIRECTOR)
  deletemember(
    @Param('projectId') projectId: string,
    @Param('userId') UserId: string,
    @CurrentUser() user,
  ) {
    return this.projectsService.deleteMember(projectId, UserId, user);
  }
}

/* GET    /api/v1/projects                 # Мои проекты (Все роли)      ++++++
POST   /api/v1/projects                 # Создать проект (ADMIN, DIRECTOR, ZAM_DIRECTOR)  +++++
GET    /api/v1/projects/:id             # Детали проекта (Участники + DIRECTOR, ADMIN)   --------- 
PATCH  /api/v1/projects/:id             # Обновить проект (ADMIN, Owner проекта)        ----------
DELETE /api/v1/projects/:id             # Удалить проект (ADMIN, Owner проекта)   +++++
POST   /api/v1/projects/:id/members     # Добавить участника (ADMIN, Owner, ZAM_DIRECTOR)  +++++++
DELETE /api/v1/projects/:id/members/:userId  # Удалить участника (ADMIN, Owner)   +++++
GET    /api/v1/projects/:id/statistics  # Статистика проекта (DIRECTOR, ADMIN, Owner) */
