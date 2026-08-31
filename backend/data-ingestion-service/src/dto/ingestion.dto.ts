export class GetHealthDto {}

export class IngestDataDto {
  source: string;
  payload: string;
  contentType?: string;
}