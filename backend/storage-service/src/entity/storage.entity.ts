export class GetHealthEntity {
  status: number;
  message: string;
}

// Sprint 2 Week 3 (Varun) — added file_id/original_name/mime_type/size so a
// successful upload gives the caller something to actually reference. See
// storage.proto for the corresponding field numbers.
export class UploadFileEntity {
  status: number;
  message: string;
  file_id?: string;
  original_name?: string;
  mime_type?: string;
  size?: number;
}
