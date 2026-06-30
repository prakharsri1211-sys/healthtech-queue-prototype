package com.example.healthtech.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "vitals_logs")
public class VitalsLog {
    @Id
    private String id;

    private String userName;

    private Integer heartRate;

    private String status;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }
    
    public Integer getHeartRate() { return heartRate; }
    public void setHeartRate(Integer heartRate) { this.heartRate = heartRate; }
    
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
