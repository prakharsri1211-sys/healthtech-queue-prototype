package com.example.healthtech.controller;

import com.example.healthtech.model.ClinicMetadata;
import com.example.healthtech.model.Doctor;
import com.example.healthtech.repository.jpa.DoctorRepository;
import com.example.healthtech.repository.mongodb.ClinicMetadataRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/clinic-metadata")
public class ClinicMetadataController {

    private final ClinicMetadataRepository clinicMetadataRepository;
    private final DoctorRepository doctorRepository;

    public ClinicMetadataController(ClinicMetadataRepository clinicMetadataRepository, DoctorRepository doctorRepository) {
        this.clinicMetadataRepository = clinicMetadataRepository;
        this.doctorRepository = doctorRepository;
    }

    @GetMapping("/{doctorId}")
    public ResponseEntity<?> getClinicMetadata(@PathVariable Long doctorId) {
        Optional<ClinicMetadata> metadataOpt = clinicMetadataRepository.findByDoctorId(doctorId);
        if (metadataOpt.isEmpty()) {
            Optional<Doctor> docOpt = doctorRepository.findById(doctorId).or(() -> doctorRepository.findByAccountId(doctorId));
            String name = "General Clinic";
            String address = "Address not configured";
            java.util.List<String> facilities = new java.util.ArrayList<>();
            if (docOpt.isPresent()) {
                Doctor d = docOpt.get();
                if (d.getClinicName() != null) name = d.getClinicName();
                if (d.getClinicAddress() != null) address = d.getClinicAddress();
                if (Boolean.TRUE.equals(d.getWheelchairAccessible())) facilities.add("Wheelchair Access");
                if (Boolean.TRUE.equals(d.getPharmacyAvailable())) facilities.add("Pharmacy Attached");
                if (Boolean.TRUE.equals(d.getStretcherAvailable())) facilities.add("Stretcher Available");
                if (Boolean.TRUE.equals(d.getAdmitDepartment())) facilities.add("Admit Department");
            }
            if (facilities.isEmpty()) {
                facilities = List.of("Wheelchair Access", "Pharmacy Attached");
            }
            ClinicMetadata defaultMeta = new ClinicMetadata(doctorId, name, address, facilities);
            return ResponseEntity.ok(defaultMeta);
        }
        
        ClinicMetadata meta = metadataOpt.get();
        if (meta.getClinicAddress() == null) {
            Optional<Doctor> docOpt = doctorRepository.findById(doctorId).or(() -> doctorRepository.findByAccountId(doctorId));
            if (docOpt.isPresent()) {
                meta.setClinicAddress(docOpt.get().getClinicAddress());
            }
        }
        return ResponseEntity.ok(meta);
    }

    @PutMapping("/{doctorId}/facilities")
    public ResponseEntity<?> updateFacilities(@PathVariable Long doctorId, @RequestBody List<String> facilities) {
        Optional<ClinicMetadata> metadataOpt = clinicMetadataRepository.findByDoctorId(doctorId);
        ClinicMetadata meta;
        if (metadataOpt.isEmpty()) {
            meta = new ClinicMetadata(doctorId, "General Clinic", facilities);
        } else {
            meta = metadataOpt.get();
            meta.setFacilities(facilities);
        }
        clinicMetadataRepository.save(meta);
        return ResponseEntity.ok(meta);
    }
}
