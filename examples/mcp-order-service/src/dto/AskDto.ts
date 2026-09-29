import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Body of the `/ask` SSE endpoint. */
export class AskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  question!: string;
}
