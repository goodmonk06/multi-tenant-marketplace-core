import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ShopStatus } from '@prisma/client';

export class UpdateShopDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(ShopStatus)
  status?: ShopStatus;
}
