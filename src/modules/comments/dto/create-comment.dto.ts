import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'Хороший' })
  @IsString()
  content: string;

  @ApiProperty({ example: 'Хороший' })
  @IsString()
  parentCommentId?: string;
}
