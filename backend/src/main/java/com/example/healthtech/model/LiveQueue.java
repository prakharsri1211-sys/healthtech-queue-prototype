package com.example.healthtech.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "live_queues")
public class LiveQueue {
    @Id
    private String id;
    private Long doctorId;
    private Integer currentlyServingToken = 0;
    private Integer lastIssuedToken = 0;
    private Boolean emergencyFlag = false;

    // getters/setters
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

    public Integer getCurrentlyServingToken() {
        return currentlyServingToken;
    }

    public void setCurrentlyServingToken(Integer currentlyServingToken) {
        this.currentlyServingToken = currentlyServingToken;
    }

    public Integer getLastIssuedToken() {
        return lastIssuedToken;
    }

    public void setLastIssuedToken(Integer lastIssuedToken) {
        this.lastIssuedToken = lastIssuedToken;
    }

    public Boolean getEmergencyFlag() {
        return emergencyFlag;
    }

    public void setEmergencyFlag(Boolean emergencyFlag) {
        this.emergencyFlag = emergencyFlag;
    }
}
