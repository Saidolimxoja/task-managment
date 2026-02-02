// src/tasks/dto/update-task.dto.ts
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { TaskPriority } from '../../../common/enums/task-priority.enum';
import { TaskStatus } from '../../../common/enums/task-status.enum';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTaskDto {
  @ApiProperty({
    example: 'название Задачи',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    example: 'Описание Задачи',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: [
      TaskStatus.TODO,
      TaskStatus.IN_PROGRESS,
      TaskStatus.APPROVED,
      TaskStatus.REVIEW,
      TaskStatus.REJECTED,
    ],
    enum: TaskStatus,
    default: TaskStatus.TODO,
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty({
    example: [
      TaskPriority.LOW,
      TaskPriority.HIGH,
      TaskPriority.MEDIUM,
      TaskPriority.URGENT,
    ],
    enum: TaskPriority,
    default: TaskPriority.HIGH,
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;
}
