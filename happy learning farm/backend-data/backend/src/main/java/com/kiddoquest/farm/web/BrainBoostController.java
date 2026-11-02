package com.kiddoquest.farm.web;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.kiddoquest.farm.brain.BrainBoostService;
import com.kiddoquest.farm.web.BrainDtos.BrainState;
import com.kiddoquest.farm.web.BrainDtos.ProfileWrite;
import com.kiddoquest.farm.web.BrainDtos.ResultSaved;
import com.kiddoquest.farm.web.BrainDtos.ResultWrite;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/children/{childId}/brain-boost")
@Tag(name = "Brain Boost")
public class BrainBoostController {

    private final BrainBoostService brain;

    public BrainBoostController(BrainBoostService brain) {
        this.brain = brain;
    }

    @GetMapping
    @Operation(summary = "This child's Brain Boost profile (null: the default for their grade) and progress on every level")
    public BrainState get(@AuthenticationPrincipal Jwt jwt, @PathVariable String childId) {
        return brain.state(ChildController.owner(jwt), childId);
    }

    @PostMapping("/profile")
    @Operation(summary = "Parent: publish this child's topics, levels, rules and questions. Progress is kept. Needs the parent PIN.")
    public BrainState writeProfile(@AuthenticationPrincipal Jwt jwt, @PathVariable String childId,
            @Valid @RequestBody ProfileWrite body) {
        return brain.writeProfile(ChildController.owner(jwt), childId, body.pin(), body.profile());
    }

    @PostMapping("/profile/draft")
    @Operation(summary = "Parent: save a draft of this child's profile without showing it to the child. Needs the parent PIN.")
    public BrainState writeDraft(@AuthenticationPrincipal Jwt jwt, @PathVariable String childId,
            @Valid @RequestBody ProfileWrite body) {
        return brain.writeDraft(ChildController.owner(jwt), childId, body.pin(), body.profile());
    }

    @PostMapping("/results")
    @Operation(summary = "Save one finished or stopped level. Sending the same attemptId again counts it once.")
    public ResultSaved result(@AuthenticationPrincipal Jwt jwt, @PathVariable String childId,
            @Valid @RequestBody ResultWrite body) {
        return brain.record(ChildController.owner(jwt), childId, body);
    }
}
