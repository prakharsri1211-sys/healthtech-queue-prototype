package com.example.healthtech.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class RawWebSocketConfig implements WebSocketConfigurer {

    private final DashboardWebSocketHandler dashboardWebSocketHandler;

    public RawWebSocketConfig(DashboardWebSocketHandler dashboardWebSocketHandler) {
        this.dashboardWebSocketHandler = dashboardWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // Register raw WebSocket handlers for the dashboards
        registry.addHandler(dashboardWebSocketHandler, "/ws-queue").setAllowedOrigins("*");
        registry.addHandler(dashboardWebSocketHandler, "/ws-emergency").setAllowedOrigins("*");
    }
}
