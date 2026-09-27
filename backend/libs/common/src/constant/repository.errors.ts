
//Domain-level errors the repository throws.

//notificationId not found, or found but not owned by the given userId.
export class NotFoundError extends Error {
  constructor(message = "Notification not found") {
    super(message);
    this.name = "NotFoundError";
  }
}


//A foreign key or other referential constraint failed. Distinct from NotFoundError because it means the *input* was bad, not that a lookup missed.

export class InvalidReferenceError extends Error {
  constructor(message = "Referenced entity does not exist") {
    super(message);
    this.name = "InvalidReferenceError";
  }
}

//Supabase/Postgres was unreachable or timed out. No internal retry.
export class DatabaseUnavailableError extends Error {
  constructor(message = "Database is unavailable") {
    super(message);
    this.name = "DatabaseUnavailableError";
  }
}

//Catch-all for constraint/validation failures not covered above.
export class RepositoryError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "RepositoryError";
  }
}
