package com.example.healthtech.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

@Document(collection = "patients")
public class Patient {

    @Id
    private String id;
    @Indexed
    private Long accountId;

    private String name;
    private int age;
    @Indexed(unique = true, sparse = true)
    private String aadharOrAbhaId;
    private String identityType;
    private String udidCardNumber;
    private String gender;

    // Getters and Setters
    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Long getAccountId() {
        return accountId;
    }

    public void setAccountId(Long accountId) {
        this.accountId = accountId;
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

    public int getAge() {
        return age;
    }

    public void setAge(int age) {
        this.age = age;
    }

    public String getAadharOrAbhaId() {
        return aadharOrAbhaId;
    }

    public void setAadharOrAbhaId(String aadharOrAbhaId) {
        if (aadharOrAbhaId == null || aadharOrAbhaId.trim().isEmpty()) {
            throw new IllegalArgumentException("Aadhar/ABHA ID cannot be null or empty");
        }
        this.aadharOrAbhaId = aadharOrAbhaId;
    }

    public String getIdentityType() {
        return identityType;
    }

    public void setIdentityType(String identityType) {
        this.identityType = identityType;
    }

    public String getUdidCardNumber() {
        return udidCardNumber;
    }

    public void setUdidCardNumber(String udidCardNumber) {
        this.udidCardNumber = udidCardNumber;
    }
}
