import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@Controller('projects/:projectId/tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // -------------------------------
  // 1. Получить все задачи проекта
  @ApiOperation({
    summary: 'Получить ВСЕХ Своих TASKS',
  })
  @ApiBearerAuth('access-token')
  @Get()
  getAll(@Param('projectId') projectId: string, @CurrentUser() user) {
    return this.tasksService.getAllTasks(projectId, user);
  }

  // -------------------------------
  // 2. Создать задачу (ADMIN, ZAM_DIRECTOR, EMPLOYEE)
  @ApiOperation({
    summary: 'Создать задачу (ADMIN, ZAM_DIRECTOR, EMPLOYEE)',
  })
  @ApiBearerAuth('access-token')
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.ZAM_DIRECTOR, Role.EMPLOYEE, Role.DIRECTOR)
  createTask(
    @Param('projectId') projectId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser() user,
  ) {
    return this.tasksService.createTask(projectId, dto, user);
  }

  // -------------------------------
  // 3. Получить детали задачи
  @ApiOperation({
    summary: 'Получить Детали Задачи',
  })
  @ApiBearerAuth('access-token')
  @Get(':id')
  getTask(
    @Param('projectId') projectId: string,
    @Param('id') taskId: string,
    @CurrentUser() user,
  ) {
    return this.tasksService.getTaskById(taskId, user);
  }

  // -------------------------------
  // 4. Обновить задачу (Creator, Assignee, ADMIN)
  @ApiOperation({
    summary: 'Обновить задачу (Creator, Assignee, ADMIN)',
  })
  @ApiBearerAuth('access-token')
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.ZAM_DIRECTOR, Role.EMPLOYEE) // здесь проверка будет через сервис: creator/assignee
  updateTask(
    @Param('projectId') projectId: string,
    @Param('id') taskId: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user,
  ) {
    return this.tasksService.updateTask(taskId, dto, user);
  }

  // -------------------------------
  // 5. Удалить задачу (ADMIN, Creator)
  @ApiOperation({
    summary: 'Удалить задачу (ADMIN, Creator)',
  })
  @ApiBearerAuth('access-token')
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.ZAM_DIRECTOR) // сервис проверит creator
  deleteTask(
    @Param('projectId') projectId: string,
    @Param('id') taskId: string,
    @CurrentUser() user,
  ) {
    return this.tasksService.deleteTask(taskId, user);
  }

  // -------------------------------
  // 6. Изменить статус задачи (Assignee, ADMIN, ZAM_DIRECTOR)
  @ApiOperation({
    summary: 'Изменить статус задачи (Assignee, ADMIN, ZAM_DIRECTOR)',
  })
  @ApiBearerAuth('access-token')
  @Patch(':id/status')
  changeStatus(
    @Param('projectId') projectId: string,
    @Param('id') taskId: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() user,
  ) {
    return this.tasksService.changeStatus(taskId, dto.status, user);
  }

  // -------------------------------
  // 7. Утвердить задачу → APPROVED (ZAM_DIRECTOR, ADMIN)
  @ApiOperation({
    summary: 'Утвердить задачу → APPROVED (ZAM_DIRECTOR, ADMIN)',
  })
  @ApiBearerAuth('access-token')
  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.ZAM_DIRECTOR)
  approveTask(
    @Param('projectId') projectId: string,
    @Param('id') taskId: string,
    @CurrentUser() user,
  ) {
    return this.tasksService.approveTask(taskId, user);
  }

  // -------------------------------
  // 8. Отклонить задачу → REJECTED (ZAM_DIRECTOR, ADMIN)
  @ApiOperation({
    summary: 'Отклонить задачу → REJECTED (ZAM_DIRECTOR, ADMIN)',
  })
  @ApiBearerAuth('access-token')
  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.ZAM_DIRECTOR)
  rejectTask(
    @Param('projectId') projectId: string,
    @Param('id') taskId: string,
    @CurrentUser() user,
  ) {
    return this.tasksService.rejectTask(taskId, user);
  }

  // -------------------------------
  // 9. Назначить исполнителя (ADMIN, ZAM_DIRECTOR, Creator)
  @ApiOperation({
    summary: 'Назначить исполнителя (ADMIN, ZAM_DIRECTOR, Creator)',
  })
  @ApiBearerAuth('access-token')
  @Patch(':id/assign')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.ZAM_DIRECTOR, Role.DIRECTOR)
  assignTask(
    @Param('projectId') projectId: string,
    @Param('id') taskId: string,
    @Body() dto: AssignTaskDto,
    @CurrentUser() user,
  ) {
    return this.tasksService.assignTask(taskId, dto.assigneeId, user);
  }

  // -------------------------------
  // 10. Мои назначенные задачи
  @ApiOperation({
    summary: 'Мои назначенные задачи',
  })
  @ApiBearerAuth('access-token')
  @Get('/my/assigned')
  myAssignedTasks(@Param('projectId') projectId: string, @CurrentUser() user) {
    return this.tasksService.getMyAssignedTasks(user);
  }

  // -------------------------------
  // 11. Мои созданные задачи
  @ApiOperation({
    summary: 'Мои созданные задачи',
  })
  @ApiBearerAuth('access-token')
  @Get('/my/created')
  myCreatedTasks(@Param('projectId') projectId: string, @CurrentUser() user) {
    return this.tasksService.getMyCreatedTasks(user);
  }
}

/* 

GET    /api/v1/projects/:projectId/tasks              # Все задачи проекта
POST   /api/v1/projects/:projectId/tasks              # Создать задачу (ADMIN, ZAM_DIRECTOR, EMPLOYEE)
GET    /api/v1/tasks/:id                              # Детали задачи
PATCH  /api/v1/tasks/:id                              # Обновить задачу (Creator, Assignee, ADMIN)
DELETE /api/v1/tasks/:id                              # Удалить задачу (ADMIN, Creator)
PATCH  /api/v1/tasks/:id/status                       # Изменить статус (Assignee, ADMIN, ZAM_DIRECTOR)
PATCH  /api/v1/tasks/:id/approve                      # Утвердить задачу → DONE (ZAM_DIRECTOR, ADMIN)
PATCH  /api/v1/tasks/:id/reject                       # Отклонить задачу → REJECTED (ZAM_DIRECTOR, ADMIN)
PATCH  /api/v1/tasks/:id/assign                       # Назначить исполнителя (ADMIN, ZAM_DIRECTOR, Creator)
GET    /api/v1/tasks/my/assigned                      # Мои назначенные задачи
GET    /api/v1/tasks/my/created                       # Мои созданные задачи

 */
