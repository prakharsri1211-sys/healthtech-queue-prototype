package com.example.healthtech.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "availability", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"doctor_id", "date"})
})
public class Availability {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "doctor_id")
    private Long doctorId;

    @Column(name = "date")
    @com.fasterxml.jackson.annotation.JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate date;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(name = "is_closed")
    private boolean isClosed;

    @Column(name = "patient_capacity")
    private Integer patientCapacity;

    @Column(name = "premium_capacity")
    private Integer premiumCapacity;

    @Column(name = "standard_capacity")
    private Integer standardCapacity;

    @Transient
    private long bookedCount;

    @Transient
    private long premiumCount;

    @Transient
    private long standardCount;

    public Availability() {
    }

    public Availability(Long doctorId, LocalDate date, LocalTime startTime, LocalTime endTime, boolean isClosed) {
        this.doctorId = doctorId;
        this.date = date;
        this.startTime = startTime;
        this.endTime = endTime;
        this.isClosed = isClosed;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getDoctorId() {
        return doctorId;
    }

    public void setDoctorId(Long doctorId) {
        this.doctorId = doctorId;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
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

    public boolean isClosed() {
        return isClosed;
    }

    public void setClosed(boolean isClosed) {
        this.isClosed = isClosed;
    }

    public Integer getPatientCapacity() {
        return patientCapacity;
    }

    public void setPatientCapacity(Integer patientCapacity) {
        this.patientCapacity = patientCapacity;
    }

    public long getBookedCount() {
        return bookedCount;
    }

    public void setBookedCount(long bookedCount) {
        this.bookedCount = bookedCount;
    }

    public long getPremiumCount() {
        return premiumCount;
    }

    public void setPremiumCount(long premiumCount) {
        this.premiumCount = premiumCount;
    }

    public long getStandardCount() {
        return standardCount;
    }

    public void setStandardCount(long standardCount) {
        this.standardCount = standardCount;
    }

    public Integer getPremiumCapacity() {
        return premiumCapacity;
    }

    public void setPremiumCapacity(Integer premiumCapacity) {
        this.premiumCapacity = premiumCapacity;
    }

    public Integer getStandardCapacity() {
        return standardCapacity;
    }

    public void setStandardCapacity(Integer standardCapacity) {
        this.standardCapacity = standardCapacity;
    }
}
