package com.example.healthtech.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class StaffAlreadyAssignedException extends RuntimeException {
    public StaffAlreadyAssignedException(String message) {
        super(message);
    }
}
