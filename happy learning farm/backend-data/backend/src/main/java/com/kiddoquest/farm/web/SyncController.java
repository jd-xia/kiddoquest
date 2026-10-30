package com.kiddoquest.farm.web;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.kiddoquest.farm.service.SyncService;
import com.kiddoquest.farm.web.FarmDtos.SyncRequest;
import com.kiddoquest.farm.web.FarmDtos.SyncResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/children/{childId}/sync")
@Tag(name = "Sync")
public class SyncController {

    private final SyncService sync;

    public SyncController(SyncService sync) {
        this.sync = sync;
    }

    @PostMapping
    @Operation(summary = "Manually sync one child farm", description = """
            upload saves this device only when baseRevision is the revision last loaded.
            A mismatch returns status=conflict and does not write.
            keep_local replaces the saved farm after the player confirms.
            keep_server returns the saved farm and does not write.
            merge keeps the further progress on each part, then saves.
            Repeating the same idempotencyKey returns the first result.
            """)
    public SyncResponse sync(@AuthenticationPrincipal Jwt jwt, @PathVariable String childId, @Valid @RequestBody SyncRequest request) {
        return sync.sync(ChildController.owner(jwt), ChildController.email(jwt), childId, request);
    }
}
