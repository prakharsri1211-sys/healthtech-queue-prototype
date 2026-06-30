package com.example.healthtech.controller;

import com.example.healthtech.service.QueueService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
public class QueueUpdateController {

    private final QueueService queueService;

    public QueueUpdateController(QueueService queueService) {
        this.queueService = queueService;
    }

/*
    @MessageMapping("/queue-action")
    @SendTo("/topic/queue-updates")
    public Map<String, Object> handleQueueAction(Map<String, Object> action) {
        ...
    }
*/
}
