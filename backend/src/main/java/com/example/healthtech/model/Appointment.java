package com.example.healthtech.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.LocalDate;

@Document(collection = "appointments")
@CompoundIndexes({
    @CompoundIndex(name = "idx_patient_date", def = "{'patientId': 1, 'date': 1}"),
    @CompoundIndex(name = "idx_doctor_date", def = "{'doctorId': 1, 'date': 1}"),
    @CompoundIndex(name = "idx_doctor_date_tier", def = "{'doctorId': 1, 'date': 1, 'isPremium': 1}"),
    @CompoundIndex(name = "idx_doctor_date_slot", def = "{'doctorId': 1, 'date': 1, 'timeSlot': 1}")
})
public class Appointment {

    @Id
    private String id;

    private String patientId;
    private String patientName;

    @Indexed
    private Long doctorId;

    private String doctorName;
    private Long accountId;

    @Indexed
    @com.fasterxml.jackson.annotation.JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate date;

    private String timeSlot;
    private Boolean isPremium = false;
    private String tier; // PREMIUM, FREE
    private Integer etaMinutes;
    private String clinicAddress;

    @Indexed
    private String status; // WAITING, IN_SESSION, COMPLETED, CANCELLED
    private Integer tokenNumber;
    private Boolean isCheckedIn = false;
    private String specialty;

    // Volatile NoSQL fields
    private String websocketSessionId;
    private Integer currentQueuePosition;

    public Appointment() {
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getPatientId() {
        return patientId;
    }

    public void setPatientId(String patientId) {
        this.patientId = patientId;
    }

    public String getPatientName() {
        return patientName;
    }

    public void setPatientName(String patientName) {
        this.patientName = patientName;
    }

    public Long getDoctorId() {
        return doctorId;
    }

    public void setDoctorId(Long doctorId) {
        this.doctorId = doctorId;
    }

    public String getDoctorName() {
        return doctorName;
    }

    public void setDoctorName(String doctorName) {
        this.doctorName = doctorName;
    }

    public Long getAccountId() {
        return accountId;
    }

    public void setAccountId(Long accountId) {
        this.accountId = accountId;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public String getTimeSlot() {
        return timeSlot;
    }

    public void setTimeSlot(String timeSlot) {
        this.timeSlot = timeSlot;
    }

    public Boolean getIsPremium() {
        return isPremium;
    }

    public void setIsPremium(Boolean isPremium) {
        this.isPremium = isPremium;
    }

    public String getTier() {
        return tier;
    }

    public void setTier(String tier) {
        this.tier = tier;
    }

    public Integer getEtaMinutes() {
        return etaMinutes;
    }

    public void setEtaMinutes(Integer etaMinutes) {
        this.etaMinutes = etaMinutes;
    }

    public String getClinicAddress() {
        return clinicAddress;
    }

    public void setClinicAddress(String clinicAddress) {
        this.clinicAddress = clinicAddress;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Integer getTokenNumber() {
        return tokenNumber;
    }

    public void setTokenNumber(Integer tokenNumber) {
        this.tokenNumber = tokenNumber;
    }

    public Boolean getIsCheckedIn() {
        return isCheckedIn;
    }

    public void setIsCheckedIn(Boolean isCheckedIn) {
        this.isCheckedIn = isCheckedIn;
    }

    public String getWebsocketSessionId() {
        return websocketSessionId;
    }

    public void setWebsocketSessionId(String websocketSessionId) {
        this.websocketSessionId = websocketSessionId;
    }

    public Integer getCurrentQueuePosition() {
        return currentQueuePosition;
    }

    public void setCurrentQueuePosition(Integer currentQueuePosition) {
        this.currentQueuePosition = currentQueuePosition;
    }

    public String getSpecialty() {
        return specialty;
    }

    public void setSpecialty(String specialty) {
        this.specialty = specialty;
    }

    private Double patientLatitude;
    private Double patientLongitude;

    public Double getPatientLatitude() {
        return patientLatitude;
    }

    public void setPatientLatitude(Double patientLatitude) {
        this.patientLatitude = patientLatitude;
    }

    public Double getPatientLongitude() {
        return patientLongitude;
    }

    public void setPatientLongitude(Double patientLongitude) {
        this.patientLongitude = patientLongitude;
    }
}
