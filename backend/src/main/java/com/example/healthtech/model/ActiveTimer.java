package com.example.healthtech.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class ActiveTimer {
    @Id
    private Long patientId;

    private LocalDateTime lateCountdownStart;
    private Integer arrivalEtaMinutes;

    // getters/setters
    public Long getPatientId() { return patientId; }
    public void setPatientId(Long patientId) { this.patientId = patientId; }
    public LocalDateTime getLateCountdownStart() { return lateCountdownStart; }
    public void setLateCountdownStart(LocalDateTime lateCountdownStart) { this.lateCountdownStart = lateCountdownStart; }
    public Integer getArrivalEtaMinutes() { return arrivalEtaMinutes; }
    public void setArrivalEtaMinutes(Integer arrivalEtaMinutes) { this.arrivalEtaMinutes = arrivalEtaMinutes; }
}
