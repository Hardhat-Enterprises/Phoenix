export class GetHealthDto {}

export class IngestDataDto {
  source: string;
  payload: string;
  contentType?: string;
}

export class CreateHazardDto {
  hazard_type: string;
  severity_level: string;
  event_status: string;
  geo_location_id: string;
  start_time: string;
  end_time?: string;
  source_ref_event?: string;
  description?: string;
}