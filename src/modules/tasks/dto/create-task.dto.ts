// src/tasks/dto/create-task.dto.ts
import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { TaskPriority } from '../../../common/enums/task-priority.enum';
import { TaskStatus } from '../../../common/enums/task-status.enum';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({
    example: 'название Задачи',
    required: false,
  })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'Описание Задачи',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: [TaskStatus.TODO],
    enum: TaskStatus,
    default: TaskStatus.TODO,
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty({
    example: TaskPriority.LOW,
    enum: TaskPriority,
    default: TaskPriority.HIGH,
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiProperty({
    example: '02dd3f82-64ef-4d7e-8c9a-6a24dad15854',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  assigneeId?: string; // Можно сразу назначить исполнителя

  @IsOptional()
  @IsDateString()
  deadline?: string; // Дедлайн
}
