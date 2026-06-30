package com.example.healthtech.repository.jpa;

import com.example.healthtech.model.Mediator;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MediatorRepository extends JpaRepository<Mediator, Long> {
    Optional<Mediator> findByAccountId(Long accountId);
}
