-- HealthTech Prototype - Initial Schema
-- Uses IF NOT EXISTS guards to safely handle databases pre-seeded by ddl-auto:update

CREATE TABLE IF NOT EXISTS account (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    role VARCHAR(255),
    full_name VARCHAR(255),
    phone_number VARCHAR(255),
    primary_aadhar_number VARCHAR(255) UNIQUE,
    identity_verified BOOLEAN NOT NULL DEFAULT FALSE,
    age INTEGER
);

CREATE TABLE IF NOT EXISTS mediator (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255),
    clinic VARCHAR(255),
    phone VARCHAR(255),
    doctor_id BIGINT,
    account_id BIGINT REFERENCES account(id)
);

CREATE TABLE IF NOT EXISTS doctor (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255),
    speciality VARCHAR(255),
    qualification VARCHAR(255),
    start_time TIME,
    end_time TIME,
    booking_window_days INTEGER,
    max_patients_per_day INTEGER,
    target_age_range VARCHAR(255),
    pharmacy_available BOOLEAN,
    wheelchair_accessible BOOLEAN,
    mediator_id BIGINT,
    clinic_name VARCHAR(255),
    stretcher_available BOOLEAN,
    admit_department BOOLEAN,
    gender_preference VARCHAR(255),
    bank_account_name VARCHAR(255),
    bank_account_number VARCHAR(255),
    ifsc_code VARCHAR(255),
    clinic_address VARCHAR(255),
    pincode VARCHAR(255),
    emergency_contact VARCHAR(255),
    account_id BIGINT REFERENCES account(id)
);

-- Add columns safely (will fail silently if already present via DO block)
DO $$
BEGIN
    -- mediator.doctor_id → points to doctor
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='mediator' AND column_name='doctor_id'
    ) THEN
        ALTER TABLE mediator ADD COLUMN doctor_id BIGINT;
    END IF;

    -- doctor.mediator_id → points to account (mediator's account id)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='doctor' AND column_name='mediator_id'
    ) THEN
        ALTER TABLE doctor ADD COLUMN mediator_id BIGINT;
    END IF;
END $$;

-- Enforce 1:1 exclusivity via unique constraints (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_mediator_doctor_id'
    ) THEN
        ALTER TABLE mediator ADD CONSTRAINT uq_mediator_doctor_id UNIQUE (doctor_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_doctor_mediator_id'
    ) THEN
        ALTER TABLE doctor ADD CONSTRAINT uq_doctor_mediator_id UNIQUE (mediator_id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS availability (
    id BIGSERIAL PRIMARY KEY,
    doctor_id BIGINT REFERENCES doctor(id),
    date DATE,
    start_time TIME,
    end_time TIME,
    is_closed BOOLEAN,
    patient_capacity INTEGER,
    premium_capacity INTEGER,
    standard_capacity INTEGER,
    UNIQUE (doctor_id, date)
);

CREATE TABLE IF NOT EXISTS finance_ledger (
    id BIGSERIAL PRIMARY KEY,
    patient_id VARCHAR(255),
    total_fee INTEGER,
    credit_balance INTEGER,
    credit_expiry_date DATE
);

CREATE TABLE IF NOT EXISTS clinic_details (
    id BIGSERIAL PRIMARY KEY,
    doctor_id BIGINT UNIQUE REFERENCES account(id),
    wheelchair_accessible BOOLEAN DEFAULT FALSE,
    stretcher_available BOOLEAN DEFAULT FALSE,
    admit_department BOOLEAN DEFAULT FALSE,
    pharmacy_available BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS appt_history (
    id BIGSERIAL PRIMARY KEY,
    patient_id VARCHAR(255),
    visit_date DATE,
    diagnosis TEXT,
    visit_type VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS active_timer (
    patient_id BIGINT PRIMARY KEY,
    late_countdown_start TIMESTAMP,
    arrival_eta_minutes INTEGER
);
