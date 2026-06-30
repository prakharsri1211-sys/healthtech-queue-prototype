package com.example.healthtech.controller;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.util.Map;

/*
@Controller
public class EmergencyController {

    @MessageMapping("/signal-emergency")
    @SendTo("/topic/emergency")
    public Map<String, String> broadcastEmergency(Map<String, String> message) {
        System.out.println("Emergency Signal Received: " + message);
        return Map.of(
                "type", "EMERGENCY",
                "sender", message.getOrDefault("sender", "SYSTEM"),
                "timestamp", String.valueOf(System.currentTimeMillis()));
    }
}
*/
