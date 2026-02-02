import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('tasks/:taskId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @ApiOperation({
    summary: 'Комментарии к задаче',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.ZAM_DIRECTOR, Role.EMPLOYEE, Role.DIRECTOR)
  @Post()
  create(
    @Param('taskId') taskId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user,
  ) {
    return this.commentsService.createComment(taskId, dto, user);
  }

  @ApiOperation({
    summary: 'Добавить комментарий (Все кроме VIEWER)',
  })
  @ApiBearerAuth('access-token')
  @Get()
  getAllcomments(@Param('taskId') taskId: string, @CurrentUser() user) {
    return this.commentsService.getTaskComments(taskId, user);
  }

  @ApiOperation({
    summary: 'Редактировать комментарий (Author, ADMIN)',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.ZAM_DIRECTOR, Role.EMPLOYEE)
  @Patch(':id')
  update(
    @Param('id') commentId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user,
    dto: UpdateCommentDto,
  ) {
    return this.commentsService.updateComment(commentId, dto, user);
  }

  @ApiOperation({
    summary: 'Удалить комментарий (Author, ADMIN)',
  })
  @ApiBearerAuth('access-token')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.ZAM_DIRECTOR, Role.EMPLOYEE)
  @Delete(':id')
  remove(
    @Param('id') commentId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user,
  ) {
    return this.commentsService.deleteComment(commentId, user);
  }
}
