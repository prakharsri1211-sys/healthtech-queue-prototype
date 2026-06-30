package com.example.healthtech.controller;

import com.example.healthtech.model.VitalsLog;
import com.example.healthtech.repository.mongodb.VitalsLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/vitals")
 // Allow React frontend
public class VitalsLogController {

    @Autowired
    private VitalsLogRepository repository;

    @PostMapping
    public ResponseEntity<VitalsLog> logVitals(@RequestBody VitalsLog vitalsLog) {
        VitalsLog savedLog = repository.save(vitalsLog);
        return ResponseEntity.ok(savedLog);
    }

    @GetMapping
    public ResponseEntity<Iterable<VitalsLog>> getVitals() {
        return ResponseEntity.ok(repository.findAll());
    }
}
