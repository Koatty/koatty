import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Input of the destructive tool: validated by the same koatty_validation path as HTTP bodies. */
export class RefundDto {
  @IsString()
  @IsNotEmpty()
  orderNo!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  reason!: string;
}
