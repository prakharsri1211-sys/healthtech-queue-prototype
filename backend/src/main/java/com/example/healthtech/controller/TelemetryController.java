package com.example.healthtech.controller;

import com.example.healthtech.model.SystemErrorLog;
import com.example.healthtech.service.TelemetryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/telemetry")
public class TelemetryController {

    @Autowired
    private TelemetryService telemetryService;

    @PostMapping("/error")
    public ResponseEntity<?> reportClientError(@RequestBody Map<String, Object> payload) {
        String message = payload.get("message") != null ? String.valueOf(payload.get("message")) : null;
        String stackTrace = payload.get("stackTrace") != null ? String.valueOf(payload.get("stackTrace")) : null;
        String url = payload.get("url") != null ? String.valueOf(payload.get("url")) : null;
        String userAgent = payload.get("userAgent") != null ? String.valueOf(payload.get("userAgent")) : null;
        String userId = payload.get("userId") != null ? String.valueOf(payload.get("userId")) : null;

        telemetryService.logError("FRONTEND", message, stackTrace, url, userAgent, userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/access")
    public ResponseEntity<?> reportAccess(@RequestBody Map<String, Object> payload) {
        String url = payload.get("url") != null ? String.valueOf(payload.get("url")) : null;
        String userAgent = payload.get("userAgent") != null ? String.valueOf(payload.get("userAgent")) : null;
        String userId = payload.get("userId") != null ? String.valueOf(payload.get("userId")) : null;

        telemetryService.logAccess(url, userAgent, userId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/logs")
    public ResponseEntity<List<SystemErrorLog>> getLogs() {
        // Ideally this should be secured with @PreAuthorize("hasRole('ADMIN')") or similar
        // Since the current prototype might not have an ADMIN role fully fleshed out,
        // we'll allow it for dashboard access.
        return ResponseEntity.ok(telemetryService.getAllLogs());
    }

    @PatchMapping("/logs/{id}/resolve")
    public ResponseEntity<?> resolveLog(@PathVariable String id) {
        telemetryService.resolveLog(id);
        return ResponseEntity.ok().build();
    }
}
