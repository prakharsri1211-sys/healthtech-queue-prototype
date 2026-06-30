package com.example.healthtech.model;

import jakarta.persistence.*;

@Entity
public class Account {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;
    private String password;
    private String role; // ROLE_PATIENT, ROLE_DOCTOR, ROLE_MEDIATOR
    private String fullName;

    @Convert(converter = com.example.healthtech.config.AttributeEncryptor.class)
    private String phoneNumber;

    @Column(unique = true, nullable = false)
    @Convert(converter = com.example.healthtech.config.AttributeEncryptor.class)
    private String primaryAadharNumber;

    @Column(unique = true, nullable = true)
    @Convert(converter = com.example.healthtech.config.AttributeEncryptor.class)
    private String govHealthId;

    @Column(nullable = false)
    private boolean identityVerified = false;

    private Integer age;

    /**
     * Identity Token — unique, private handle (like @username on Instagram).
     * Only visible to the account owner. Used internally to link Patient/Doctor/Mediator profiles.
     * LegalName (fullName) is used publicly; identityToken is used for system-level cross-references.
     */
    @Column(unique = true, nullable = true)
    private String identityToken;

    // Getters and Setters
    public String getGovHealthId() {
        return govHealthId;
    }

    public void setGovHealthId(String govHealthId) {
        this.govHealthId = govHealthId;
    }
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getPrimaryAadharNumber() {
        return primaryAadharNumber;
    }

    public void setPrimaryAadharNumber(String primaryAadharNumber) {
        this.primaryAadharNumber = primaryAadharNumber;
    }

    public boolean isIdentityVerified() {
        return identityVerified;
    }

    public void setIdentityVerified(boolean identityVerified) {
        this.identityVerified = identityVerified;
    }

    public Integer getAge() {
        return age;
    }

    public void setAge(Integer age) {
        this.age = age;
    }

    public String getIdentityToken() {
        return identityToken;
    }

    public void setIdentityToken(String identityToken) {
        this.identityToken = identityToken;
    }
}
