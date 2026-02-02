// src/tasks/dto/change-status.dto.ts
import { IsEnum } from 'class-validator';
import { TaskStatus } from '../../../common/enums/task-status.enum';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeStatusDto {
  @ApiProperty({
    example: [
      TaskStatus.APPROVED,
      TaskStatus.IN_PROGRESS,
      TaskStatus.REJECTED,
      TaskStatus.REVIEW,
      TaskStatus.TODO,
    ],
  })
  @IsEnum(TaskStatus)
  status: TaskStatus;
}
