package com.example.healthtech.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
public class ApptHistory {
    public enum VisitType { FIRST_VISIT, FOLLOW_UP }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String patientId;
    private LocalDate visitDate;

    @Column(columnDefinition = "TEXT")
    private String diagnosis;

    @Enumerated(EnumType.STRING)
    private VisitType visitType;

    private Long doctorId;
    private Boolean isPremium;
    private Integer feeAmount;

    private String patientName;
    private java.time.ZonedDateTime timestamp;
    private String paymentMode;
    private String appointmentTime;

    // getters/setters
    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }
    public java.time.ZonedDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(java.time.ZonedDateTime timestamp) { this.timestamp = timestamp; }
    public String getPaymentMode() { return paymentMode; }
    public void setPaymentMode(String paymentMode) { this.paymentMode = paymentMode; }
    public String getAppointmentTime() { return appointmentTime; }
    public void setAppointmentTime(String appointmentTime) { this.appointmentTime = appointmentTime; }

    public Long getDoctorId() { return doctorId; }
    public void setDoctorId(Long doctorId) { this.doctorId = doctorId; }
    public Boolean getIsPremium() { return isPremium; }
    public void setIsPremium(Boolean isPremium) { this.isPremium = isPremium; }
    public Integer getFeeAmount() { return feeAmount; }
    public void setFeeAmount(Integer feeAmount) { this.feeAmount = feeAmount; }
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }
    public LocalDate getVisitDate() { return visitDate; }
    public void setVisitDate(LocalDate visitDate) { this.visitDate = visitDate; }
    public String getDiagnosis() { return diagnosis; }
    public void setDiagnosis(String diagnosis) { this.diagnosis = diagnosis; }
    public VisitType getVisitType() { return visitType; }
    public void setVisitType(VisitType visitType) { this.visitType = visitType; }
}
