import { IsUUID } from 'class-validator';

export class StartTrialDto {
  @IsUUID()
  planId!: string;
}
