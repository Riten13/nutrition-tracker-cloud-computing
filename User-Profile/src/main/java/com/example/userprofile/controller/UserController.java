package com.example.userprofile.controller;

import com.example.userprofile.dto.*;
import com.example.userprofile.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "User Profile Management", description = "Endpoints for managing user profiles, allergies, and dietary preferences")
@SecurityRequirement(name = "bearerAuth")
public class UserController {

    private final UserService userService;

    @Operation(summary = "Get User Profile", description = "Fetches the complete profile of the user including allergies and preferences.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Profile fetched successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    @GetMapping("/{userId}")
    public ResponseEntity<UserProfileResponse> getUserProfile(
            @Parameter(description = "ID of the user") @PathVariable Long userId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        UserProfileResponse response = userService.getUserProfile(userId, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Update Profile", description = "Updates the physical profile (age, weight, height, activity level).")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Profile updated successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    @PutMapping("/{userId}")
    public ResponseEntity<ProfileDto> updateProfile(
            @Parameter(description = "ID of the user") @PathVariable Long userId,
            @RequestBody ProfileDto profileDto,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        ProfileDto updatedProfile = userService.updateProfile(userId, profileDto, userDetails.getUsername());
        return ResponseEntity.ok(updatedProfile);
    }

    @Operation(summary = "Add Allergy", description = "Adds a new allergy to the user's profile.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Allergy added successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @PostMapping("/{userId}/allergies")
    public ResponseEntity<AllergyDto> addAllergy(
            @Parameter(description = "ID of the user") @PathVariable Long userId,
            @Valid @RequestBody AllergyDto allergyDto,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        AllergyDto createdAllergy = userService.addAllergy(userId, allergyDto, userDetails.getUsername());
        return new ResponseEntity<>(createdAllergy, HttpStatus.CREATED);
    }

    @Operation(summary = "Get Allergies", description = "Retrieves all allergies associated with the user.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Allergies fetched successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @GetMapping("/{userId}/allergies")
    public ResponseEntity<List<AllergyDto>> getAllergies(
            @Parameter(description = "ID of the user") @PathVariable Long userId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        List<AllergyDto> allergies = userService.getAllergies(userId, userDetails.getUsername());
        return ResponseEntity.ok(allergies);
    }

    @Operation(summary = "Delete Allergy", description = "Removes a specific allergy from the user's profile.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Allergy deleted successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "404", description = "Allergy not found")
    })
    @DeleteMapping("/{userId}/allergies/{allergyId}")
    public ResponseEntity<Void> deleteAllergy(
            @Parameter(description = "ID of the user") @PathVariable Long userId,
            @Parameter(description = "ID of the allergy to delete") @PathVariable Long allergyId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        userService.deleteAllergy(userId, allergyId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Update Dietary Preferences", description = "Updates the dietary preferences for the user.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Preferences updated successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @PutMapping("/{userId}/preferences")
    public ResponseEntity<DietaryPreferenceDto> updateDietaryPreference(
            @Parameter(description = "ID of the user") @PathVariable Long userId,
            @RequestBody DietaryPreferenceDto preferenceDto,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        DietaryPreferenceDto updatedPreference = userService.updateDietaryPreference(userId, preferenceDto, userDetails.getUsername());
        return ResponseEntity.ok(updatedPreference);
    }

    @Operation(summary = "Update Nutrition Goals", description = "Updates personalized nutrition and fitness targets (calories, protein, carbs, fat, fitness goal).")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Goals updated successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    @PutMapping("/{userId}/goals")
    public ResponseEntity<NutritionGoalDto> updateNutritionGoal(
            @Parameter(description = "ID of the user") @PathVariable Long userId,
            @RequestBody NutritionGoalDto goalDto,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        NutritionGoalDto updatedGoals = userService.updateNutritionGoal(userId, goalDto, userDetails.getUsername());
        return ResponseEntity.ok(updatedGoals);
    }
}
