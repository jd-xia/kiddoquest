package com.kiddoquest.openid.web;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.kiddoquest.openid.web.AuthExceptions.AuthUnavailableException;
import com.kiddoquest.openid.web.AuthExceptions.EmailLinkedException;
import com.kiddoquest.openid.web.AuthExceptions.InvalidTokenException;
import com.kiddoquest.openid.web.AuthExceptions.UnknownProviderException;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(InvalidTokenException.class)
    ResponseEntity<ApiError> invalid(InvalidTokenException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ApiError("invalid_token", ex.getMessage()));
    }

    @ExceptionHandler(AuthUnavailableException.class)
    ResponseEntity<ApiError> unavailable(AuthUnavailableException ex) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(new ApiError("unavailable", ex.getMessage()));
    }

    @ExceptionHandler(UnknownProviderException.class)
    ResponseEntity<ApiError> unknown(UnknownProviderException ex) {
        return ResponseEntity.badRequest().body(new ApiError("unknown_provider", ex.getMessage()));
    }

    @ExceptionHandler(EmailLinkedException.class)
    ResponseEntity<ApiError> emailLinked(EmailLinkedException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiError("email_linked", ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> invalidRequest(MethodArgumentNotValidException ex) {
        return ResponseEntity.badRequest().body(new ApiError("invalid_request", "Sign-in request is incomplete"));
    }
}
