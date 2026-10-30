package com.kiddoquest.farm.web;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@Tag(name = "Health")
public class HealthController {

    @GetMapping("/api/v1/health")
    @Operation(summary = "Whether this farm server can answer")
    public Map<String, Boolean> health() {
        return Map.of("ok", true);
    }
}
