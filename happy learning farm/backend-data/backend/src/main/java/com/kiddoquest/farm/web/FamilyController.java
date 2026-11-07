package com.kiddoquest.farm.web;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.kiddoquest.farm.family.FamilyService;
import com.kiddoquest.farm.service.ChildService;
import com.kiddoquest.farm.web.FarmDtos.CoinWrite;
import com.kiddoquest.farm.web.FarmDtos.Family;
import com.kiddoquest.farm.web.FarmDtos.KidTimeWrite;
import com.kiddoquest.farm.web.FarmDtos.PinCheck;
import com.kiddoquest.farm.web.FarmDtos.PinSet;
import com.kiddoquest.farm.web.FarmDtos.PlayBeat;
import com.kiddoquest.farm.web.FarmDtos.PlayTime;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;

@RestController
@Validated
@Tag(name = "Family")
public class FamilyController {

    private final FamilyService family;
    private final ChildService children;

    public FamilyController(FamilyService family, ChildService children) {
        this.family = family;
        this.children = children;
    }

    @GetMapping("/api/v1/family")
    @Operation(summary = "The account's kids with their main flag, minutes a day and time played today")
    public Family get(@AuthenticationPrincipal Jwt jwt, @RequestParam @Pattern(regexp = FarmDtos.DAY) String day) {
        return family.family(ChildController.owner(jwt), day);
    }

    @PostMapping("/api/v1/family/pin")
    @Operation(summary = "Set the parent PIN (4 digits). Changing it needs the old PIN.")
    public Family setPin(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody PinSet request,
            @RequestParam @Pattern(regexp = FarmDtos.DAY) String day) {
        return family.setPin(ChildController.owner(jwt), request.oldPin(), request.pin(), day);
    }

    @PostMapping("/api/v1/family/unlock")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Check the parent PIN. Five wrong PINs in a row wait one minute.")
    public void unlock(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody PinCheck request) {
        family.unlock(ChildController.owner(jwt), request.pin());
    }

    @PostMapping("/api/v1/family/kids/{childId}")
    @Operation(summary = "Parent: mark the main farm, set minutes a day, or add time today")
    public Family writeKid(@AuthenticationPrincipal Jwt jwt, @PathVariable String childId, @Valid @RequestBody KidTimeWrite request) {
        return family.writeKid(ChildController.owner(jwt), childId, request);
    }

    @PostMapping("/api/v1/family/kids/{childId}/coins")
    @Operation(summary = "Parent: give a child coins (add > 0) or take some away (add < 0). Never below 0. Needs the parent PIN.")
    public Family coins(@AuthenticationPrincipal Jwt jwt, @PathVariable String childId, @Valid @RequestBody CoinWrite request) {
        String owner = ChildController.owner(jwt);
        family.unlock(owner, request.pin());
        children.adjustCoins(owner, ChildController.email(jwt), childId, request.add());
        return family.family(owner, request.day());
    }

    @PostMapping("/api/v1/children/{childId}/play")
    @Operation(summary = "Heartbeat while a farm is on screen: counts play time and says how much is left today")
    public PlayTime beat(@AuthenticationPrincipal Jwt jwt, @PathVariable String childId, @Valid @RequestBody PlayBeat request) {
        return family.beat(ChildController.owner(jwt), childId, request.day(), request.seconds(), request.screen());
    }
}
