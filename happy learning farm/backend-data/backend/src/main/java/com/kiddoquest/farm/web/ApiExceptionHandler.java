package com.kiddoquest.farm.web;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.kiddoquest.farm.web.FarmExceptions.NotFoundException;
import com.kiddoquest.farm.web.FarmExceptions.PinException;
import com.kiddoquest.farm.web.FarmExceptions.ScreenTakenException;
import com.kiddoquest.farm.web.FarmExceptions.SyncRejectedException;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    ResponseEntity<ApiError> missing(NotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiError("not_found", ex.getMessage()));
    }

    @ExceptionHandler(PinException.class)
    ResponseEntity<ApiError> pin(PinException ex) {
        HttpStatus status = "pin_wait".equals(ex.getCode()) ? HttpStatus.TOO_MANY_REQUESTS : HttpStatus.FORBIDDEN;
        return ResponseEntity.status(status).body(new ApiError(ex.getCode(), ex.getMessage()));
    }

    @ExceptionHandler(ScreenTakenException.class)
    ResponseEntity<ApiError> taken(ScreenTakenException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiError("screen_taken", ex.getMessage()));
    }

    @ExceptionHandler(SyncRejectedException.class)
    ResponseEntity<ApiError> rejected(SyncRejectedException ex) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(new ApiError("rejected", ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> invalid(MethodArgumentNotValidException ex) {
        return ResponseEntity.badRequest().body(new ApiError("invalid_request", "The farm request is incomplete."));
    }

    @ExceptionHandler(jakarta.validation.ConstraintViolationException.class)
    ResponseEntity<ApiError> badParam(jakarta.validation.ConstraintViolationException ex) {
        return ResponseEntity.badRequest().body(new ApiError("invalid_request", "The farm request is incomplete."));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiError> unreadable(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest().body(new ApiError("invalid_request", "The farm request could not be read."));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiError> conflict(DataIntegrityViolationException ex) {
        String text = String.valueOf(ex.getMostSpecificCause().getMessage());
        if (text.contains("uk_farm_child_email_name")) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body(new ApiError("rejected", "This account already has a child with that name."));
        }
        if (text.contains("uk_farm_club_name_key")) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body(new ApiError("rejected", "That club name is taken. Try another name."));
        }
        if (text.contains("uk_farm_club_member_slot")) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ApiError("interrupted", "Someone joined that club at the same moment. Try again."));
        }
        if (text.contains("voice_data") || text.contains("Data too long")) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body(new ApiError("rejected", "That voice message could not be saved. Update the farm server, then try again."));
        }
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ApiError("interrupted", "Sync was interrupted. This device was not changed. Try again."));
    }
}
