package com.example.healthtech.service;

import org.springframework.stereotype.Service;

@Service
public class LocationUtility {
    private static final double EARTH_RADIUS_KM = 6371.0;
    private static final double ROUTING_MULTIPLIER = 1.3;
    private static final double AVERAGE_SPEED_KMH = 30.0;

    /**
     * Calculates the straight-line distance between two points in kilometers
     * using the Haversine formula, and applies a routing multiplier.
     */
    public double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        double straightLineKm = EARTH_RADIUS_KM * c;
        
        return straightLineKm * ROUTING_MULTIPLIER;
    }

    /**
     * Calculates the estimated travel time in minutes based on the distance
     * and a fixed average speed of 30 km/h.
     */
    public int calculateTravelTimeMinutes(double distanceKm) {
        // Time = Distance / Speed
        // (distanceKm / 30.0) gives time in hours. Multiply by 60 for minutes.
        return (int) Math.round((distanceKm / AVERAGE_SPEED_KMH) * 60);
    }

    /**
     * Calculates estimated travel time in minutes from exact coordinates.
     */
    public int calculateTravelTimeInMinutes(double userLat, double userLng, double clinicLat, double clinicLng) {
        double dLat = Math.toRadians(clinicLat - userLat);
        double dLng = Math.toRadians(clinicLng - userLng);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(userLat)) * Math.cos(Math.toRadians(clinicLat)) *
                   Math.sin(dLng / 2) * Math.sin(dLng / 2);
                   
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        double straightLineDistanceKM = EARTH_RADIUS_KM * c;

        double estimatedRoadDistanceKM = straightLineDistanceKM * ROUTING_MULTIPLIER;
        double travelTimeInHours = estimatedRoadDistanceKM / AVERAGE_SPEED_KMH;

        return (int) Math.ceil(travelTimeInHours * 60);
    }
}
