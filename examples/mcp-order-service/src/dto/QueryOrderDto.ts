import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

/** Read-only tool input; the JSON Schema published over MCP is derived from it. */
export class QueryOrderDto {
  @IsString()
  @IsNotEmpty()
  orderNo!: string;

  /** Accepted (and then ignored by the in-memory demo store) to show optional fields. */
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;
}
