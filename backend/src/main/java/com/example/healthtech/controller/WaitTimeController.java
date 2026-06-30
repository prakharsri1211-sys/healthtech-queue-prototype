package com.example.healthtech.controller;

import com.example.healthtech.service.WaitTimeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/appointments")
public class WaitTimeController {

    @Autowired
    private WaitTimeService waitTimeService;

    @GetMapping("/estimate/{userId}")
    public String getEstimate(@PathVariable Long userId) {
        return waitTimeService.getEstimate(userId);
    }

    @PostMapping("/preview")
    public Map<String, Object> getBookingPreview(@RequestBody Map<String, Object> payload) {
        Long doctorId = Long.valueOf(payload.get("doctorId").toString());
        Double patientLat = payload.get("patientLat") != null ? Double.valueOf(payload.get("patientLat").toString()) : null;
        Double patientLng = payload.get("patientLng") != null ? Double.valueOf(payload.get("patientLng").toString()) : null;
        
        return waitTimeService.getBookingPreview(doctorId, patientLat, patientLng);
    }
}
