import { IsString, IsOptional, IsEnum, IsDateString} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProjectStatus } from 'src/common/enums/project-status.enum';

export class CreateProjectDto {
  @ApiProperty({ example: 'Новый проект', description: 'Название проекта' })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'Описание проекта',
    description: 'Описание проекта',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({example:'HEllo'})
  @IsString()
  code:string;

  @ApiProperty({
    example: ProjectStatus.ACTIVE,
    enum: ProjectStatus,
    default: ProjectStatus.ACTIVE,
  })
  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus = ProjectStatus.ACTIVE;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;
}
