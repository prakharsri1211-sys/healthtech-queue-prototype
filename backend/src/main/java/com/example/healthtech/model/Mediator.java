package com.example.healthtech.model;

import jakarta.persistence.*;

@Entity
@Table(name = "mediator", uniqueConstraints = {
    @UniqueConstraint(name = "uq_mediator_doctor", columnNames = {"doctor_id"})
})
public class Mediator {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name")
    private String name;

    @Column(name = "clinic")
    private String clinic;

    @Column(name = "phone")
    private String phone;

    @Column(name = "doctor_id", unique = true)
    private Long doctorId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id")
    private Account account;

    public Mediator() {
    }

    public Mediator(String name, String clinic, String phone) {
        this.name = name;
        this.clinic = clinic;
        this.phone = phone;
    }

    // Getters and Setters
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

    public String getClinic() {
        return clinic;
    }

    public void setClinic(String clinic) {
        this.clinic = clinic;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public Long getDoctorId() {
        return doctorId;
    }

    public void setDoctorId(Long doctorId) {
        this.doctorId = doctorId;
    }
}
