import { SCHEMA_VERSION, today, validateState } from './model.js';
// UTF-8 file bytes (including pretty-printing) are not localStorage capacity.
// Accept the same schema as saved records; commit decides whether the target
// browser can atomically store the validated state without replacing it on failure.
export async function readBackupFile(file, currentDate = today()) {
  const text = await file.text();
  return validateState(JSON.parse(text), currentDate);
}

export function serializeBackup(state) {
  return JSON.stringify({ ...state, schemaVersion: SCHEMA_VERSION }, null, 2);
}
