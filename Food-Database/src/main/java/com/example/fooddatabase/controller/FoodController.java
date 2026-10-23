package com.example.fooddatabase.controller;

import com.example.fooddatabase.dto.FoodRequest;
import com.example.fooddatabase.dto.FoodResponse;
import com.example.fooddatabase.dto.NutritionDto;
import com.example.fooddatabase.service.FoodService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * FoodController handles all incoming HTTP requests for the /api/foods endpoint.
 *
 * It delegates all business logic to FoodService.
 * It does NOT interact with the database directly.
 */
@Slf4j
@RestController
@RequestMapping("/api/foods")
@RequiredArgsConstructor
@Tag(name = "Food API", description = "Endpoints for managing food and nutrition master data")
@io.swagger.v3.oas.annotations.security.SecurityRequirement(name = "bearerAuth")
public class FoodController {

    private final FoodService foodService;

    // ─────────────────────────────────────────────────────────────
    // GET /api/foods
    // GET /api/foods?name=chicken
    // GET /api/foods?category=meat
    // ─────────────────────────────────────────────────────────────

    @Operation(
            summary = "Get / Search Foods",
            description = "Returns all foods. Use optional query parameters to search by name or filter by category."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of foods returned successfully",
                    content = @Content(schema = @Schema(implementation = FoodResponse.class)))
    })
    @GetMapping
    public ResponseEntity<List<FoodResponse>> getFoods(
            @Parameter(description = "Search foods by name (case-insensitive, partial match)")
            @RequestParam(required = false) String name,
            @Parameter(description = "Filter foods by category (case-insensitive)")
            @RequestParam(required = false) String category) {

        log.info("GET /api/foods - name={}, category={}", name, category);

        List<FoodResponse> foods = foodService.getFoods(name, category);
        return ResponseEntity.ok(foods);
    }

    // ─────────────────────────────────────────────────────────────
    // GET /api/foods/{foodId}
    // ─────────────────────────────────────────────────────────────

    @Operation(
            summary = "Get Food by ID",
            description = "Returns a single food along with its embedded nutrition information."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Food found and returned",
                    content = @Content(schema = @Schema(implementation = FoodResponse.class))),
            @ApiResponse(responseCode = "404", description = "Food not found", content = @Content)
    })
    @GetMapping("/{foodId}")
    public ResponseEntity<FoodResponse> getFoodById(
            @Parameter(description = "The ID of the food to retrieve")
            @PathVariable String foodId) {

        log.info("GET /api/foods/{}", foodId);

        FoodResponse food = foodService.getFoodById(foodId);
        return ResponseEntity.ok(food);
    }

    // ─────────────────────────────────────────────────────────────
    // POST /api/foods
    // ─────────────────────────────────────────────────────────────

    @Operation(
            summary = "Add Food",
            description = "Creates a new food with its nutrition information. Returns the created food with its generated ID."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Food created successfully",
                    content = @Content(schema = @Schema(implementation = FoodResponse.class)))
    })
    @PostMapping
    public ResponseEntity<FoodResponse> addFood(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    description = "Food details and nutrition to create",
                    required = true,
                    content = @Content(schema = @Schema(implementation = FoodRequest.class)))
            @RequestBody FoodRequest request) {

        log.info("POST /api/foods - name={}", request.getName());

        FoodResponse createdFood = foodService.addFood(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdFood);
    }

    // ─────────────────────────────────────────────────────────────
    // PUT /api/foods/{foodId}
    // ─────────────────────────────────────────────────────────────

    @Operation(
            summary = "Update Food",
            description = "Updates an existing food and its nutrition information by ID."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Food updated successfully",
                    content = @Content(schema = @Schema(implementation = FoodResponse.class))),
            @ApiResponse(responseCode = "404", description = "Food not found", content = @Content)
    })
    @PutMapping("/{foodId}")
    public ResponseEntity<FoodResponse> updateFood(
            @Parameter(description = "The ID of the food to update")
            @PathVariable String foodId,
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    description = "Updated food details and nutrition",
                    required = true,
                    content = @Content(schema = @Schema(implementation = FoodRequest.class)))
            @RequestBody FoodRequest request) {

        log.info("PUT /api/foods/{}", foodId);

        FoodResponse updatedFood = foodService.updateFood(foodId, request);
        return ResponseEntity.ok(updatedFood);
    }

    // ─────────────────────────────────────────────────────────────
    // DELETE /api/foods/{foodId}
    // ─────────────────────────────────────────────────────────────

    @Operation(
            summary = "Delete Food",
            description = "Deletes a food by ID. Returns 204 No Content on success."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Food deleted successfully", content = @Content),
            @ApiResponse(responseCode = "404", description = "Food not found", content = @Content)
    })
    @DeleteMapping("/{foodId}")
    public ResponseEntity<Void> deleteFood(
            @Parameter(description = "The ID of the food to delete")
            @PathVariable String foodId) {

        log.info("DELETE /api/foods/{}", foodId);

        foodService.deleteFood(foodId);
        return ResponseEntity.noContent().build();
    }

    // ─────────────────────────────────────────────────────────────
    // GET /api/foods/{foodId}/nutrition
    // ─────────────────────────────────────────────────────────────

    @Operation(
            summary = "Get Nutrition by Food ID",
            description = "Returns only the nutrition information for a food. Used by other microservices."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Nutrition returned successfully",
                    content = @Content(schema = @Schema(implementation = NutritionDto.class))),
            @ApiResponse(responseCode = "404", description = "Food not found", content = @Content)
    })
    @GetMapping("/{foodId}/nutrition")
    public ResponseEntity<NutritionDto> getNutrition(
            @Parameter(description = "The ID of the food whose nutrition to retrieve")
            @PathVariable String foodId) {

        log.info("GET /api/foods/{}/nutrition", foodId);

        NutritionDto nutrition = foodService.getNutrition(foodId);
        return ResponseEntity.ok(nutrition);
    }

    // ─────────────────────────────────────────────────────────────
    // POST /api/foods/{foodId}/image
    // ─────────────────────────────────────────────────────────────

    @Operation(
            summary = "Upload or Replace Food Image",
            description = "Uploads a JPG, PNG, or WebP image (max 5MB) for an existing food item. Requires ROLE_USER or ROLE_ADMIN. Returns updated food with presigned image URL."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Image uploaded successfully",
                    content = @Content(schema = @Schema(implementation = FoodResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid image content or size", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Missing or invalid JWT", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Requires authenticated user (ROLE_USER or ROLE_ADMIN)", content = @Content),
            @ApiResponse(responseCode = "404", description = "Food not found", content = @Content)
    })
    @PostMapping(value = "/{foodId}/image", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<FoodResponse> uploadFoodImage(
            @Parameter(description = "The ID of the food")
            @PathVariable String foodId,
            @Parameter(description = "Image file (JPG, PNG, WebP, max 5 MB)")
            @RequestParam(value = "image", required = false) org.springframework.web.multipart.MultipartFile image,
            @RequestParam(value = "file", required = false) org.springframework.web.multipart.MultipartFile file) {

        org.springframework.web.multipart.MultipartFile uploadFile = (image != null) ? image : file;
        if (uploadFile == null) {
            throw new com.example.fooddatabase.exception.InvalidImageException("Image file parameter ('image' or 'file') is required.");
        }

        log.info("POST /api/foods/{}/image - filename={}, size={}", foodId, uploadFile.getOriginalFilename(), uploadFile.getSize());
        FoodResponse response = foodService.uploadFoodImage(foodId, uploadFile);
        return ResponseEntity.ok(response);
    }

    // ─────────────────────────────────────────────────────────────
    // DELETE /api/foods/{foodId}/image
    // ─────────────────────────────────────────────────────────────

    @Operation(
            summary = "Delete Food Image",
            description = "Deletes the S3 image associated with a food item. Requires ROLE_USER or ROLE_ADMIN."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Image removed successfully",
                    content = @Content(schema = @Schema(implementation = FoodResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Missing or invalid JWT", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Requires authenticated user (ROLE_USER or ROLE_ADMIN)", content = @Content),
            @ApiResponse(responseCode = "404", description = "Food not found", content = @Content)
    })
    @DeleteMapping("/{foodId}/image")
    public ResponseEntity<FoodResponse> deleteFoodImage(
            @Parameter(description = "The ID of the food")
            @PathVariable String foodId) {

        log.info("DELETE /api/foods/{}/image", foodId);
        FoodResponse response = foodService.deleteFoodImage(foodId);
        return ResponseEntity.ok(response);
    }
}
