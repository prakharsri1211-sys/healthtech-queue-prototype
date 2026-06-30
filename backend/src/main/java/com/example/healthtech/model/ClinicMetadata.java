package com.example.healthtech.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.List;

@Document(collection = "clinic_metadata")
public class ClinicMetadata {
    @Id
    private String id;
    private Long doctorId; // Linked PostgreSQL Doctor ID
    private String clinicName;
    private List<String> facilities;

    private String clinicAddress;

    public ClinicMetadata() {}

    public ClinicMetadata(Long doctorId, String clinicName, List<String> facilities) {
        this.doctorId = doctorId;
        this.clinicName = clinicName;
        this.facilities = facilities;
    }

    public ClinicMetadata(Long doctorId, String clinicName, String clinicAddress, List<String> facilities) {
        this.doctorId = doctorId;
        this.clinicName = clinicName;
        this.clinicAddress = clinicAddress;
        this.facilities = facilities;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Long getDoctorId() {
        return doctorId;
    }

    public void setDoctorId(Long doctorId) {
        this.doctorId = doctorId;
    }

    public String getClinicName() {
        return clinicName;
    }

    public void setClinicName(String clinicName) {
        this.clinicName = clinicName;
    }

    public String getClinicAddress() {
        return clinicAddress;
    }

    public void setClinicAddress(String clinicAddress) {
        this.clinicAddress = clinicAddress;
    }

    public List<String> getFacilities() {
        return facilities;
    }

    public void setFacilities(List<String> facilities) {
        this.facilities = facilities;
    }
}
