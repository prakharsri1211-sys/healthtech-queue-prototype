package com.example.healthtech.config;

import java.util.List;

public class AppConstants {
    // Appointment Statuses
    public static final String STATUS_WAITING = "WAITING";
    public static final String STATUS_BOOKED = "BOOKED";
    public static final String STATUS_SCHEDULED = "SCHEDULED";
    public static final String STATUS_CONFIRMED = "CONFIRMED";
    public static final String STATUS_CHECKED_IN = "CHECKED_IN";
    public static final String STATUS_ACTIVE = "ACTIVE";
    public static final String STATUS_ARRIVED = "ARRIVED";
    public static final String STATUS_IN_SESSION = "IN_SESSION";
    public static final String STATUS_DELAYED = "DELAYED";
    public static final String STATUS_LATE = "LATE";
    public static final String STATUS_COMPLETED = "COMPLETED";
    public static final String STATUS_CANCELLED = "CANCELLED";
    public static final String STATUS_NO_SHOW = "NO_SHOW";

    // Groupings
    public static final List<String> ACTIVE_QUEUE_STATUSES = List.of(
        STATUS_WAITING, STATUS_CHECKED_IN, STATUS_ARRIVED, STATUS_IN_SESSION, STATUS_DELAYED, STATUS_LATE
    );
    public static final List<String> ALL_ACTIVE_STATUSES = List.of(
        STATUS_WAITING, STATUS_BOOKED, STATUS_SCHEDULED, STATUS_CONFIRMED, 
        STATUS_CHECKED_IN, STATUS_ACTIVE, STATUS_ARRIVED, STATUS_IN_SESSION, 
        STATUS_DELAYED, STATUS_LATE
    );

    // Roles
    public static final String ROLE_PATIENT = "ROLE_PATIENT";
    public static final String ROLE_DOCTOR = "ROLE_DOCTOR";
    public static final String ROLE_MEDIATOR = "ROLE_MEDIATOR";

    // Tiers
    public static final String TIER_PREMIUM = "PREMIUM";
    public static final String TIER_FREE = "FREE";
}
