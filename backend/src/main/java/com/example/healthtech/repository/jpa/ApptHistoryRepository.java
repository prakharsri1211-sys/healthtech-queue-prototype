package com.example.healthtech.repository.jpa;

import com.example.healthtech.model.ApptHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApptHistoryRepository extends JpaRepository<ApptHistory, Long> {
	long countByPatientId(String patientId);
    boolean existsByPatientIdAndVisitDate(String patientId, java.time.LocalDate visitDate);
    java.util.List<ApptHistory> findByDoctorIdAndVisitDate(Long doctorId, java.time.LocalDate visitDate);
    @org.springframework.data.jpa.repository.Query("SELECT h FROM ApptHistory h WHERE h.doctorId = :doctorId ORDER BY h.timestamp DESC")
    java.util.List<ApptHistory> findByDoctorIdOrderByTimestampDesc(@org.springframework.data.repository.query.Param("doctorId") Long doctorId);
    java.util.List<ApptHistory> findByDoctorIdAndVisitDateOrderByTimestampDesc(Long doctorId, java.time.LocalDate visitDate);
    long countByDoctorIdAndVisitDate(Long doctorId, java.time.LocalDate visitDate);
}
