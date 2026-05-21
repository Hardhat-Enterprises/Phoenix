export class GetTrainingModelsEntity {
  status: number;
  message: string;
  models?: TrainingModelItem[];
}

export class GetOneTrainingModelEntity {
  status: number;
  message: string;
  model?: TrainingModelItem;
}

export class TrainingModelItem {
  file_id: string;
  original_name: string;
  mime_type: string;
}
