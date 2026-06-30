package com.example.healthtech.model;

import jakarta.persistence.*;

@Entity
@Table(name = "clinic_details")
public class ClinicDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "doctor_id", unique = true)
    private Account doctor;

    private Boolean wheelchairAccessible = false;
    private Boolean stretcherAvailable = false;
    private Boolean admitDepartment = false;
    private Boolean pharmacyAvailable = false;

    public ClinicDetails() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Account getDoctor() {
        return doctor;
    }

    public void setDoctor(Account doctor) {
        this.doctor = doctor;
    }

    public Boolean getWheelchairAccessible() {
        return wheelchairAccessible;
    }

    public void setWheelchairAccessible(Boolean wheelchairAccessible) {
        this.wheelchairAccessible = wheelchairAccessible;
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

    public Boolean getPharmacyAvailable() {
        return pharmacyAvailable;
    }

    public void setPharmacyAvailable(Boolean pharmacyAvailable) {
        this.pharmacyAvailable = pharmacyAvailable;
    }
}
