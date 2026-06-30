package com.example.healthtech.repository.jpa;

import com.example.healthtech.model.Availability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface AvailabilityRepository extends JpaRepository<Availability, Long> {
    List<Availability> findByDoctorId(Long doctorId);

    List<Availability> findByDoctorIdAndIsClosedFalse(Long doctorId);

    List<Availability> findByDate(LocalDate date);

    java.util.Optional<Availability> findByDoctorIdAndDate(Long doctorId, LocalDate date);
}
