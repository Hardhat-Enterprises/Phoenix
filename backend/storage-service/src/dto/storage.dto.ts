export class GetHealthDto {}

export class UploadFileDto {
  file_path: string;
  original_name: string;
  mime_type: string;
  size: number;
}
