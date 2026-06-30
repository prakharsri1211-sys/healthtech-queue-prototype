-- Flyway Migration - Performance Index Tuning
-- Index foreign keys and frequently searched date columns to avoid scan bottlenecks

CREATE INDEX IF NOT EXISTS idx_doctor_account_id ON doctor(account_id);
CREATE INDEX IF NOT EXISTS idx_mediator_account_id ON mediator(account_id);
CREATE INDEX IF NOT EXISTS idx_appt_history_patient_id ON appt_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_appt_history_visit_date ON appt_history(visit_date);
