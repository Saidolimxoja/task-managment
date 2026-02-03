import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'Хороший' })
  @IsString()
  content: string;

  @ApiProperty({ example: 'Хороший' })
  @IsOptional()
  @IsString()
  parentCommentId?: string;
}
