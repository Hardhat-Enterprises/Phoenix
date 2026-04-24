export class GetHealthEntity {
    status: number;
    message: string;
}
  
export class IngestDataEntity {
    status: number;
    message: string;
    ingestionId?: string;
}

export class CreateHazardEntity {
  status: number;
  message: string;
  ingestionId?: string;
  failedReason?: string;
}