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

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @ApiOperation({
    summary: 'Получить ВСЕХ Своих Проетов',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get()
  GetAllProjects(@CurrentUser() user) {
    return this.projectsService.getAllProjects(user.id);
  }

  @ApiOperation({
    summary: 'Создать Проект',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.DIRECTOR)
  @Post()
  create(@Body() createProjectDto: CreateProjectDto, @CurrentUser() user) {
    return this.projectsService.createProject(createProjectDto, user);
  }

  @Post(':id/members')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.DIRECTOR, Role.ZAM_DIRECTOR)
  addMember(
    @Param('id') projectId: string,
    @Body() dto: { userId: string; role: ProjectMembers },
  ) {
    return this.projectsService.addMember(projectId, dto.userId, dto.role);
  }

  @Delete(':id')
  deleteProject(@Param('id')projectId: string, ){

  }
}




/* GET    /api/v1/projects                 # Мои проекты (Все роли)      ++++++
POST   /api/v1/projects                 # Создать проект (ADMIN, DIRECTOR, ZAM_DIRECTOR)  +++++
GET    /api/v1/projects/:id             # Детали проекта (Участники + DIRECTOR, ADMIN)
PATCH  /api/v1/projects/:id             # Обновить проект (ADMIN, Owner проекта)
DELETE /api/v1/projects/:id             # Удалить проект (ADMIN, Owner проекта)
POST   /api/v1/projects/:id/members     # Добавить участника (ADMIN, Owner, ZAM_DIRECTOR)  +++++++
DELETE /api/v1/projects/:id/members/:userId  # Удалить участника (ADMIN, Owner)
GET    /api/v1/projects/:id/statistics  # Статистика проекта (DIRECTOR, ADMIN, Owner) */
