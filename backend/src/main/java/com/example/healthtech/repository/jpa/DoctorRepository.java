package com.example.healthtech.repository.jpa;

import com.example.healthtech.model.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface DoctorRepository extends JpaRepository<Doctor, Long> {

    /** Returns every distinct non-null speciality string stored in the doctor table. */
    @Query("SELECT DISTINCT d.speciality FROM Doctor d WHERE d.speciality IS NOT NULL")
    List<String> findDistinctSpecialities();

    /** Returns all doctors whose speciality matches exactly (case-insensitive). */
    @Query("SELECT d FROM Doctor d WHERE LOWER(d.speciality) = LOWER(:speciality)")
    List<Doctor> findBySpecialityIgnoreCase(String speciality);

    java.util.Optional<Doctor> findByAccountId(Long accountId);
    
    java.util.Optional<Doctor> findByMediatorId(Long mediatorId);
}

