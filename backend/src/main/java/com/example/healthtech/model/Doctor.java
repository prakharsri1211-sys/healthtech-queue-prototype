package com.example.healthtech.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalTime;

@Entity
@Table(name = "doctor", uniqueConstraints = {
    @UniqueConstraint(name = "uq_doctor_mediator", columnNames = {"mediator_id"})
})
public class Doctor {
    public enum TargetAgeRange {
        CHILD, ADULT, SENIOR
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String speciality;
    private String qualification;
    private LocalTime startTime;
    private LocalTime endTime;
    private LocalTime breakStartTime;
    private LocalTime breakEndTime;
    private Integer bookingWindowDays;
    private Integer maxPatientsPerDay;
    @Enumerated(EnumType.STRING)
    private TargetAgeRange targetAgeRange;
    private Boolean pharmacyAvailable;
    private Boolean wheelchairAccessible;
    @Column(name = "mediator_id", unique = true)
    private Long mediatorId;
    private String clinicName;
    private Boolean stretcherAvailable;
    private Boolean admitDepartment;
    private String genderPreference; // MALE, FEMALE, BOTH
    private Boolean shiftStarted = false;
    private java.time.LocalDate lastShiftDate;
    private Double latitude;
    private Double longitude;
    
    // Financial & Professional Identity
    private String bankAccountName;
    private String bankAccountNumber;
    private String ifscCode;
    private String clinicAddress;
    private String pincode;
    private String emergencyContact;
    private Double totalRevenue = 0.0;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id")
    private Account account;

    // getters/setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Account getAccount() {
        return account;
    }

    public void setAccount(Account account) {
        this.account = account;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getFullName() {
        return name; // Alias for consistency
    }

    public String getSpeciality() {
        return speciality;
    }

    public void setSpeciality(String speciality) {
        this.speciality = speciality;
    }

    public String getQualification() {
        return qualification;
    }

    public void setQualification(String qualification) {
        this.qualification = qualification;
    }

    public LocalTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalTime startTime) {
        this.startTime = startTime;
    }

    public LocalTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalTime endTime) {
        this.endTime = endTime;
    }

    public LocalTime getBreakStartTime() {
        return breakStartTime;
    }

    public void setBreakStartTime(LocalTime breakStartTime) {
        this.breakStartTime = breakStartTime;
    }

    public LocalTime getBreakEndTime() {
        return breakEndTime;
    }

    public void setBreakEndTime(LocalTime breakEndTime) {
        this.breakEndTime = breakEndTime;
    }

    public Integer getBookingWindowDays() {
        return bookingWindowDays;
    }

    public void setBookingWindowDays(Integer bookingWindowDays) {
        this.bookingWindowDays = bookingWindowDays;
    }

    public Integer getMaxPatientsPerDay() {
        return maxPatientsPerDay;
    }

    public void setMaxPatientsPerDay(Integer maxPatientsPerDay) {
        this.maxPatientsPerDay = maxPatientsPerDay;
    }

    public TargetAgeRange getTargetAgeRange() {
        return targetAgeRange;
    }

    public void setTargetAgeRange(TargetAgeRange targetAgeRange) {
        this.targetAgeRange = targetAgeRange;
    }

    public Boolean getPharmacyAvailable() {
        return pharmacyAvailable;
    }

    public void setPharmacyAvailable(Boolean pharmacyAvailable) {
        this.pharmacyAvailable = pharmacyAvailable;
    }

    public Boolean getWheelchairAccessible() {
        return wheelchairAccessible;
    }

    public void setWheelchairAccessible(Boolean wheelchairAccessible) {
        this.wheelchairAccessible = wheelchairAccessible;
    }

    public Long getMediatorId() {
        return mediatorId;
    }

    public void setMediatorId(Long mediatorId) {
        this.mediatorId = mediatorId;
    }

    public String getClinicName() {
        return clinicName;
    }

    public void setClinicName(String clinicName) {
        this.clinicName = clinicName;
    }

    public Boolean getStretcherAvailable() {
        return stretcherAvailable;
    }

    public void setStretcherAvailable(Boolean stretcherAvailable) {
        this.stretcherAvailable = stretcherAvailable;
    }

    public Boolean getAdmitDepartment() {
        return admitDepartment;
    }

    public void setAdmitDepartment(Boolean admitDepartment) {
        this.admitDepartment = admitDepartment;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public String getBankAccountName() { return bankAccountName; }
    public void setBankAccountName(String bankAccountName) { this.bankAccountName = bankAccountName; }
    public String getBankAccountNumber() { return bankAccountNumber; }
    public void setBankAccountNumber(String bankAccountNumber) { this.bankAccountNumber = bankAccountNumber; }
    public String getIfscCode() { return ifscCode; }
    public void setIfscCode(String ifscCode) { this.ifscCode = ifscCode; }
    public String getClinicAddress() { return clinicAddress; }
    public void setClinicAddress(String clinicAddress) { this.clinicAddress = clinicAddress; }
    public String getPincode() { return pincode; }
    public void setPincode(String pincode) { this.pincode = pincode; }
    public String getEmergencyContact() { return emergencyContact; }
    public void setEmergencyContact(String emergencyContact) { this.emergencyContact = emergencyContact; }
    public String getGenderPreference() { return genderPreference; }
    public void setGenderPreference(String genderPreference) { this.genderPreference = genderPreference; }

    public Boolean getShiftStarted() { return shiftStarted; }
    public void setShiftStarted(Boolean shiftStarted) { this.shiftStarted = shiftStarted; }
    public java.time.LocalDate getLastShiftDate() { return lastShiftDate; }
    public void setLastShiftDate(java.time.LocalDate lastShiftDate) { this.lastShiftDate = lastShiftDate; }
    public Double getTotalRevenue() { return totalRevenue; }
    public void setTotalRevenue(Double totalRevenue) { this.totalRevenue = totalRevenue; }
}
