package com.example.healthtech.service;

import com.example.healthtech.model.Appointment;
import com.example.healthtech.repository.mongodb.AppointmentRepository;
import com.example.healthtech.config.DashboardWebSocketHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class WaitTimeService {

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private com.example.healthtech.repository.mongodb.LiveQueueEntryRepository entryRepository;

    @Autowired
    private DashboardWebSocketHandler dashboardWebSocketHandler;

    @Autowired
    private LocationUtility locationUtility;

    @Autowired
    private com.example.healthtech.repository.jpa.DoctorRepository doctorRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public void notifyPatientArrival(String appointmentId) {
        Appointment appt = appointmentRepository.findById(appointmentId).orElse(null);
        if (appt != null) {
            appt.setStatus("ARRIVED");
            appt.setIsCheckedIn(true);
            appointmentRepository.save(appt);

            // Sync with LiveQueueEntry if exists
            entryRepository.findByPatientId(appt.getPatientId()).ifPresent(entry -> {
                entry.setServed(false); // Ensure it's active
                entryRepository.save(entry);
            });

            // Broadcast full queue update to Mediator
            List<com.example.healthtech.model.LiveQueueEntry> currentQueue = entryRepository.findByServedFalseOrderByTokenNumberAsc();
            
            try {
                String payload = objectMapper.writeValueAsString(java.util.Map.of(
                    "type", "QUEUE_UPDATE",
                    "patients", currentQueue
                ));
                dashboardWebSocketHandler.broadcast(payload);
            } catch (Exception e) {
                e.printStackTrace();
            }
            
            System.out.println("Broadcasted full queue sync for arrival of: " + appt.getPatientName());
        }
    }

    public String getEstimate(Long accountId) {
        List<Appointment> allAppts = appointmentRepository.findAll();

        Appointment myAppt = allAppts.stream()
                .filter(a -> a.getAccountId() != null && a.getAccountId().equals(accountId))
                .filter(a -> !"COMPLETED".equals(a.getStatus()))
                .findFirst()
                .orElse(null);

        if (myAppt == null) {
            return "No active appointment found for today";
        }

        if (myAppt.getIsPremium()) {
            return "Priority Slot: " + LocalDateTime.now().toString();
        }

        long ahead = allAppts.stream()
                .filter(a -> a.getDoctorId() != null && a.getDoctorId().equals(myAppt.getDoctorId()))
                .filter(a -> a.getDate().equals(myAppt.getDate()))
                .filter(a -> !a.getIsPremium())
                .filter(a -> a.getEtaMinutes() != null && a.getEtaMinutes() < myAppt.getEtaMinutes())
                .filter(a -> !"COMPLETED".equals(a.getStatus()))
                .count();

        return LocalDateTime.now().plusMinutes(15 * ahead).toString();
    }

    public Map<String, Object> getBookingPreview(Long doctorId, Double patientLat, Double patientLng) {
        com.example.healthtech.model.Doctor d = doctorRepository.findById(doctorId).orElse(null);
        int travelTime = 0;
        double distance = 0.0;
        
        if (d != null && d.getLatitude() != null && d.getLongitude() != null && patientLat != null && patientLng != null) {
            distance = locationUtility.calculateDistance(patientLat, patientLng, d.getLatitude(), d.getLongitude());
            travelTime = locationUtility.calculateTravelTimeMinutes(distance);
        }

        long ahead = appointmentRepository.findAll().stream()
                .filter(a -> a.getDoctorId() != null && a.getDoctorId().equals(doctorId))
                .filter(a -> a.getDate().equals(LocalDate.now()))
                .filter(a -> !a.getIsPremium())
                .filter(a -> !"COMPLETED".equals(a.getStatus()) && !"CANCELLED".equals(a.getStatus()))
                .count();
                
        int queueWait = (int) (ahead * 10);

        return Map.of(
            "travelTimeMinutes", travelTime,
            "queueWaitTimeMinutes", queueWait,
            "totalTimeMinutes", travelTime + queueWait,
            "distanceKm", distance
        );
    }
}
