import { IsString, IsNumber, Min } from 'class-validator';

export class AddToCartDto {
  @IsString()
  listingId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}
