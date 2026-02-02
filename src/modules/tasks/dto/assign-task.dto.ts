// src/tasks/dto/assign-task.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignTaskDto {
  @ApiProperty({ example: 'e4fcce45-d73b-48b6-82ed-ab8952a1d4c1' })
  @IsUUID()
  assigneeId: string;
}
