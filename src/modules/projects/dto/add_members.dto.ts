import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { ProjectMembers } from 'src/common/enums/project-members.enum';

export class AddMembersdto {
  @ApiProperty({ example: '02dd3f82-64ef-4d7e-8c9a-6a24dad15854' })
  @IsString()
  userId: string;

  @ApiProperty({
    example: [
      ProjectMembers.MANAGER,
      ProjectMembers.MEMBER,
      ProjectMembers.VIEWER,
    ],
  })
  @IsEnum(ProjectMembers)
  @IsString()
  role: string;
}
