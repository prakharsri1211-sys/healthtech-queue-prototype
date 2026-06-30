package com.example.healthtech.service;

import com.example.healthtech.model.SystemErrorLog;
import com.example.healthtech.repository.mongodb.SystemErrorLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class TelemetryService {

    @Autowired
    private SystemErrorLogRepository logRepository;

    public void logError(String source, String message, String stackTrace, String url, String userAgent, String userId) {
        SystemErrorLog errorLog = new SystemErrorLog();
        errorLog.setLevel("ERROR");
        errorLog.setSource(source != null ? source.toUpperCase() : "UNKNOWN");
        errorLog.setMessage(message);
        errorLog.setStackTrace(stackTrace);
        errorLog.setUrl(url);
        errorLog.setUserAgent(userAgent);
        errorLog.setUserId(userId);
        
        logRepository.save(errorLog);
    }

    public void logBackendException(Exception ex) {
        StringWriter sw = new StringWriter();
        ex.printStackTrace(new PrintWriter(sw));
        String stackTrace = sw.toString();
        
        logError("BACKEND", ex.getMessage() != null ? ex.getMessage() : ex.getClass().getSimpleName(), stackTrace, null, null, null);
    }

    public void logAccess(String url, String userAgent, String userId) {
        SystemErrorLog accessLog = new SystemErrorLog();
        accessLog.setLevel("INFO");
        accessLog.setSource("ACCESS");
        accessLog.setMessage("Page View: " + url);
        accessLog.setUrl(url);
        accessLog.setUserAgent(userAgent);
        accessLog.setUserId(userId);
        accessLog.setResolved(true); // Access logs don't need resolution
        logRepository.save(accessLog);
    }

    public List<SystemErrorLog> getAllLogs() {
        return logRepository.findAllByOrderByTimestampDesc();
    }

    public void resolveLog(String id) {
        logRepository.findById(id).ifPresent(log -> {
            log.setResolved(true);
            logRepository.save(log);
        });
    }

    // Runs every day at midnight to clean up access logs older than 14 days
    @Scheduled(cron = "0 0 0 * * *")
    public void cleanupOldAccessLogs() {
        Instant oldThreshold = Instant.now().minus(14, ChronoUnit.DAYS);
        List<SystemErrorLog> oldAccessLogs = logRepository.findAll().stream()
                .filter(log -> "ACCESS".equals(log.getSource()) && log.getTimestamp().isBefore(oldThreshold))
                .toList();
        
        if (!oldAccessLogs.isEmpty()) {
            logRepository.deleteAll(oldAccessLogs);
        }
    }
}
