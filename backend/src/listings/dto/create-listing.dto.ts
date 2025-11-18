import { IsString, IsNumber, IsOptional, Min, MaxLength, IsObject } from 'class-validator';

export class CreateListingDto {
  @IsString()
  shopId: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQty?: number;

  @IsOptional()
  @IsObject()
  attributesJson?: any;
}
