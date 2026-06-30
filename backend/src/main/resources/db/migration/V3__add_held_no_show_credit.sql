-- Flyway Migration - Add held no-show credit and doctor tracking columns to finance_ledger
ALTER TABLE finance_ledger ADD COLUMN IF NOT EXISTS held_no_show_credit INTEGER DEFAULT 0;
ALTER TABLE finance_ledger ADD COLUMN IF NOT EXISTS last_no_show_doctor_id BIGINT;
