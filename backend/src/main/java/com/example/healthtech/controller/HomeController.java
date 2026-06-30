package com.example.healthtech.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;

@RestController
public class HomeController {

    @GetMapping("/")
    public void home(HttpServletResponse response) throws IOException {
        // Redirect to Swagger UI by default for easier API exploration
        response.sendRedirect("/swagger-ui/index.html");
    }

    @GetMapping("/api/status")
    public Map<String, String> status() {
        return Map.of(
                "status", "UP",
                "message", "Health-Tech Backend is running",
                "version", "0.0.1-SNAPSHOT");
    }
}
