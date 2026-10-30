package com.kiddoquest.farm.web;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.kiddoquest.farm.service.ChildService;
import com.kiddoquest.farm.web.FarmDtos.ChildPatch;
import com.kiddoquest.farm.web.FarmDtos.ChildState;
import com.kiddoquest.farm.web.FarmDtos.ChildSummary;
import com.kiddoquest.farm.web.FarmDtos.ChildWrite;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequestMapping("/api/v1/children")
@Tag(name = "Children")
public class ChildController {

    private final ChildService children;

    public ChildController(ChildService children) {
        this.children = children;
    }

    @GetMapping
    @Operation(summary = "List the signed-in account's child farms")
    public List<ChildSummary> list(@AuthenticationPrincipal Jwt jwt) {
        children.rememberEmail(owner(jwt), email(jwt));
        return children.list(owner(jwt));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a child farm. One account can keep up to five.")
    public ChildState create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ChildWrite request) {
        return children.create(owner(jwt), email(jwt), request);
    }

    @GetMapping("/{childId}")
    @Operation(summary = "Load one child farm the account is allowed to open")
    public ChildState get(@AuthenticationPrincipal Jwt jwt, @PathVariable String childId) {
        return children.get(owner(jwt), childId);
    }

    @PatchMapping("/{childId}")
    @Operation(summary = "Rename a child farm or change grade and look")
    public ChildState patch(@AuthenticationPrincipal Jwt jwt, @PathVariable String childId, @Valid @RequestBody ChildPatch request) {
        return children.patch(owner(jwt), childId, request);
    }

    @DeleteMapping("/{childId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a child farm and its saved game")
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable String childId) {
        children.delete(owner(jwt), childId);
    }

    static String owner(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new FarmExceptions.NotFoundException();
        }
        return jwt.getSubject();
    }

    static String email(Jwt jwt) {
        if (jwt == null) {
            return null;
        }
        String email = jwt.getClaimAsString("email");
        if (email == null) {
            return null;
        }
        String trimmed = email.trim().toLowerCase();
        if (!trimmed.contains("@") || trimmed.length() > 320 || trimmed.indexOf(' ') >= 0) {
            return null;
        }
        return trimmed;
    }
}
