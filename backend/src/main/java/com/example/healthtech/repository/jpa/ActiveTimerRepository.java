package com.example.healthtech.repository.jpa;

import com.example.healthtech.model.ActiveTimer;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ActiveTimerRepository extends JpaRepository<ActiveTimer, Long> {
}
