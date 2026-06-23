// ─── Full jump shape (matches DB schema) ─────────────────────────────────────
export interface JumpFull {
  id: string
  user_id: string
  jump_number: number
  date: string
  dropzone_id: string | null
  aircraft_type: string | null
  aircraft_rego: string | null
  exit_altitude_ft: number | null
  pull_altitude_ft: number | null
  deploy_altitude_ft: number | null
  freefall_seconds: number | null
  canopy_seconds: number | null
  jump_type: string | null
  jump_stage: string | null  // free-text student stage (e.g. "AFF 1", "IAD Stage 3")
  canopy_type: string | null
  canopy_gear_id: string | null
  jumper_type: string | null   // 'licensed' | 'student'
  is_favourite: boolean
  is_draft: boolean
  aad_fired: boolean
  reserve_deployed: boolean
  planned_objectives: string | null
  planned_manoeuvres: string | null
  notes: string | null
  people_on_jump: number | null
  landing_accuracy_value: string | null
  landing_accuracy_unit: string | null
  photo_url: string | null
  coordinates_lat: number | null
  coordinates_lng: number | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  dropzones: {
    name: string
    region: string
    latitude: number
    longitude: number
  } | null
  signatures?: { id: string; signed_at: string }[]
  // Local-only — undefined means synced; false means pending upload
  _synced?: boolean
  _localId?: string
}

export interface JumpSignature {
  id: string
  jump_id: string
  signature_data: string
  signer_name: string
  signer_licence_number: string
  signer_licence_rating: string | null
  signer_user_id: string | null
  outcome: string | null   // 'pass' | 'repeat' | null
  notes: string | null
  signed_at: string
}

export interface TagData {
  id: string
  name: string
  color: string
}

// ─── Jump edit audit trail ────────────────────────────────────────────────────
export interface JumpEditChange {
  field: string
  from:  string
  to:    string
}

export interface JumpEdit {
  id:        string
  jump_id:   string
  user_id:   string
  edited_at: string
  changes:   JumpEditChange[]
}

// ─── Gear (matches DB schema) ─────────────────────────────────────────────────
export interface Gear {
  id: string
  user_id: string
  type: 'rig' | 'canopy' | 'aad'
  canopy_sub_type: 'main' | 'reserve' | null
  make_model: string
  serial_number: string
  manufactured_date: string | null
  wing_loading: number | null
  jumps_on: number | null
  hours: number | null
  last_repack_date: string | null
  next_repack_date: string | null
  next_service_date: string | null
  repack_reminder_enabled: boolean
  photo_url: string | null
  created_at: string
}

// ─── Edit log ────────────────────────────────────────────────────────────────
export interface EditLogEntry {
  id: string
  user_id: string
  item_type: 'gear' | 'certificate'
  item_id: string
  changed_at: string
  changes: Array<{ field: string; from: string | null; to: string | null }>
}

// ─── Certificate (matches DB schema) ──────────────────────────────────────────
export interface Certificate {
  id: string
  user_id: string
  category: 'licence' | 'rating' | 'medical' | 'other'
  title: string
  issuing_body: string
  issued_date: string
  expires_date: string | null
  reference_number: string | null
  document_file_url: string | null
  created_at: string
}
