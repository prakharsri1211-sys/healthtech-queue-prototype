package com.example.healthtech.service;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class PincodeGeocodingService {
    private static final Logger log = LoggerFactory.getLogger(PincodeGeocodingService.class);
    
    // In-memory cache to prevent Nominatim API rate limiting (max 1 req/sec)
    private final Map<String, double[]> cache = new ConcurrentHashMap<>();
    
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Converts a pincode into [latitude, longitude] using OpenStreetMap Nominatim.
     */
    public double[] getCoordinatesForPincode(String pincode) {
        if (pincode == null || pincode.trim().isEmpty()) {
            return null;
        }
        
        String cleanPincode = pincode.trim();
        
        // Return cached coordinates instantly if we've geocoded this before
        if (cache.containsKey(cleanPincode)) {
            return cache.get(cleanPincode);
        }

        try {
            String url = "https://nominatim.openstreetmap.org/search?postalcode=" + cleanPincode + "&format=json&limit=1";
            
            // Nominatim requires a User-Agent header
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "HealthTechQueueApp/1.0");
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                if (root.isArray() && root.size() > 0) {
                    JsonNode location = root.get(0);
                    double lat = location.get("lat").asDouble();
                    double lon = location.get("lon").asDouble();
                    double[] coords = new double[]{lat, lon};
                    
                    // Cache the successful result
                    cache.put(cleanPincode, coords);
                    log.info("Geocoded pincode " + cleanPincode + " -> [" + lat + ", " + lon + "]");
                    return coords;
                }
            }
        } catch (Exception e) {
            log.error("Failed to geocode pincode: " + cleanPincode, e);
        }
        
        return null;
    }
}
