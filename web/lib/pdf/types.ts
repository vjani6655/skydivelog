export interface JumperProfile {
  full_name: string
  licence_number: string | null
  licence_rating: string | null
  home_dz: string | null
  total_jumps: number
  total_ff_seconds: number
  total_canopy_seconds: number
}

export interface PdfJump {
  id: string
  jump_number: number
  date: string
  dz_name: string | null
  dz_region: string | null
  aircraft_type: string | null
  aircraft_rego: string | null
  jump_type: string | null
  jump_stage: string | null       // free-text student stage (e.g. "AFF 1", "IAD Stage 3")
  canopy_type: string | null
  jumper_type: string | null       // 'licensed' | 'student'
  exit_altitude_ft: number | null
  pull_altitude_ft: number | null
  freefall_seconds: number | null
  canopy_seconds: number | null
  landing_accuracy_value: string | null
  landing_accuracy_unit: string | null
  notes: string | null
  people_on_jump: number | null
  aad_fired: boolean
  reserve_deployed: boolean
  planned_objectives: string | null
  planned_manoeuvres: string | null
  signer_name: string | null
  signer_licence_number: string | null
  signer_licence_rating: string | null
  signer_outcome: string | null    // 'pass' | 'repeat' | null
  signer_notes: string | null      // instructor notes (student only)
  signer_signature_data: string | null  // SVG path string from the drawn signature
}
