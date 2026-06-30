package com.example.healthtech.controller;

import com.example.healthtech.model.Doctor;
import com.example.healthtech.repository.jpa.DoctorRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/specialties")
public class SpecialtyController {

    private final DoctorRepository doctorRepository;

    public SpecialtyController(DoctorRepository doctorRepository) {
        this.doctorRepository = doctorRepository;
    }

    /**
     * GET /api/specialties
     * Returns all distinct specialties with doctor counts.
     */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getSpecialties() {
        List<String> distinctNames = doctorRepository.findDistinctSpecialities();
        List<Map<String, Object>> result = new ArrayList<>();

        for (String name : distinctNames) {
            long count = doctorRepository.findBySpecialityIgnoreCase(name).size();
            Map<String, Object> item = new HashMap<>();
            item.put("name", name);
            item.put("doctorCount", count);
            result.add(item);
        }

        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/specialties/{name}/doctors
     * Returns all doctors matching the chosen specialty.
     */
    @GetMapping("/{name}/doctors")
    public ResponseEntity<List<Doctor>> getDoctorsBySpecialty(@PathVariable String name) {
        List<Doctor> doctors = doctorRepository.findBySpecialityIgnoreCase(name);
        return ResponseEntity.ok(doctors);
    }
}
