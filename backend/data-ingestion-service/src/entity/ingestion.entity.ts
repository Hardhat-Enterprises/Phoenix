export class GetHealthEntity {
    status: number;
    message: string;
  }
  
  export class IngestDataEntity {
    status: number;
    message: string;
    ingestionId?: string;
  }