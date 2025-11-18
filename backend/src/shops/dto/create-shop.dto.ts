import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateShopDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
