package com.example.healthtech.repository.mongodb;

import com.example.healthtech.model.Appointment;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface AppointmentRepository extends MongoRepository<Appointment, String> {
    List<Appointment> findByPatientId(String patientId);
    List<Appointment> findByPatientIdAndDateGreaterThanEqual(String patientId, LocalDate date);
    List<Appointment> findByDoctorIdAndDate(Long doctorId, LocalDate date);
    List<Appointment> findByDoctorId(Long doctorId);
    List<Appointment> findByDoctorIdAndDateGreaterThanEqual(Long doctorId, LocalDate date);
    List<Appointment> findByAccountId(Long accountId);
    long countByDoctorIdAndDate(Long doctorId, LocalDate date);
    long countByDoctorIdAndDateAndIsPremiumFalse(Long doctorId, LocalDate date);
    long countByDoctorIdAndDateAndIsPremiumTrue(Long doctorId, LocalDate date);
    List<Appointment> findByDoctorIdAndDateAndIsPremiumTrue(Long doctorId, LocalDate date);
    Boolean existsByDoctorIdAndDateAndTimeSlot(Long doctorId, LocalDate date, String timeSlot);
    Boolean existsByPatientIdAndDate(String patientId, LocalDate date);
    Boolean existsByPatientIdAndDoctorIdAndDate(String patientId, Long doctorId, LocalDate date);
    @org.springframework.data.mongodb.repository.Query("{ 'patientId': ?0, 'date': ?1 }")
    List<Appointment> findByPatientIdAndAppointmentDate(String patientId, LocalDate date);
    
    @org.springframework.data.mongodb.repository.Query(value = "{ 'patientId': ?0, 'date': ?1, 'status': { $ne: ?2 } }", exists = true)
    Boolean existsByPatientIdAndAppointmentDateAndStatusNot(String patientId, LocalDate targetBookingDate, String status);

    List<Appointment> findByDateAndStatusIn(LocalDate date, List<String> statuses);
    List<Appointment> findByDoctorIdAndDateAndStatusIn(Long doctorId, LocalDate date, List<String> statuses);

    // Count standard appointments excluding cancelled — used for accurate 1-indexed token assignment
    @org.springframework.data.mongodb.repository.Query(value = "{ 'doctorId': ?0, 'date': ?1, 'isPremium': false, 'status': { $ne: ?2 } }", count = true)
    long countByDoctorIdAndDateAndIsPremiumFalseAndStatusNot(Long doctorId, LocalDate date, String status);
}
