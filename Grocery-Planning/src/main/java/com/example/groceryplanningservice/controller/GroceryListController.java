package com.example.groceryplanningservice.controller;

import com.example.groceryplanningservice.dto.*;
import com.example.groceryplanningservice.security.UserPrincipal;
import com.example.groceryplanningservice.service.GroceryListService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/grocery-lists")
@RequiredArgsConstructor
@Tag(name = "Grocery Lists", description = "APIs for managing grocery lists and grocery items")
@SecurityRequirement(name = "bearerAuth")
public class GroceryListController {

    private final GroceryListService groceryListService;

    // =========================================================================
    // Grocery List endpoints
    // =========================================================================

    @Operation(
            summary = "Create a grocery list",
            description = "Creates or retrieves the existing ACTIVE grocery list for the specified user."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Grocery list created or retrieved successfully",
                    content = @Content(schema = @Schema(implementation = GroceryListResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request body"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PostMapping
    public ResponseEntity<GroceryListResponse> createGroceryList(
            @Valid @RequestBody GroceryListRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal != null) {
            if (request.getUserId() != null && !request.getUserId().equals(principal.getUserId())) {
                throw new AccessDeniedException("Access denied: You cannot create a grocery list for another user");
            }
            request.setUserId(principal.getUserId());
        }
        Long authUserId = principal != null ? principal.getUserId() : null;
        GroceryListResponse response = groceryListService.createGroceryList(request, authUserId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @Operation(
            summary = "Get user's active grocery list",
            description = "Returns the active grocery list for the given user, safely consolidating any historical duplicates."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Active grocery list found",
                    content = @Content(schema = @Schema(implementation = GroceryListResponse.class))),
            @ApiResponse(responseCode = "403", description = "Access denied"),
            @ApiResponse(responseCode = "404", description = "No active grocery list found for this user")
    })
    @GetMapping("/{userId}")
    public ResponseEntity<GroceryListResponse> getActiveGroceryList(
            @Parameter(description = "ID of the user", example = "1")
            @PathVariable Long userId,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal != null && !userId.equals(principal.getUserId())) {
            throw new AccessDeniedException("Access denied: You can only view your own grocery list");
        }
        Long authUserId = principal != null ? principal.getUserId() : null;
        GroceryListResponse response = groceryListService.getActiveGroceryList(userId, authUserId);
        return ResponseEntity.ok(response);
    }

    // =========================================================================
    // Grocery Item endpoints
    // =========================================================================

    @Operation(
            summary = "Add a grocery item",
            description = "Adds a new item to the specified grocery list. Validates foodId with Food Database Service."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Grocery item added successfully",
                    content = @Content(schema = @Schema(implementation = GroceryItemResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request body"),
            @ApiResponse(responseCode = "403", description = "Access denied"),
            @ApiResponse(responseCode = "404", description = "Grocery list or food not found")
    })
    @PostMapping("/{listId}/items")
    public ResponseEntity<GroceryItemResponse> addGroceryItem(
            @Parameter(description = "ID of the grocery list", example = "list123")
            @PathVariable String listId,
            @Valid @RequestBody GroceryItemRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        Long authUserId = principal != null ? principal.getUserId() : null;
        GroceryItemResponse response = groceryListService.addGroceryItem(listId, request, authUserId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @Operation(
            summary = "Update a grocery item",
            description = "Updates quantity, unit, checked status, or estimated price of an item."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Grocery item updated successfully",
                    content = @Content(schema = @Schema(implementation = GroceryItemResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request body"),
            @ApiResponse(responseCode = "403", description = "Access denied"),
            @ApiResponse(responseCode = "404", description = "Grocery list or item not found")
    })
    @PutMapping("/{listId}/items/{itemId}")
    public ResponseEntity<GroceryItemResponse> updateGroceryItem(
            @Parameter(description = "ID of the grocery list", example = "list123")
            @PathVariable String listId,
            @Parameter(description = "ID of the grocery item to update", example = "item123")
            @PathVariable String itemId,
            @Valid @RequestBody GroceryItemUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        Long authUserId = principal != null ? principal.getUserId() : null;
        GroceryItemResponse response = groceryListService.updateGroceryItem(listId, itemId, request, authUserId);
        return ResponseEntity.ok(response);
    }

    @Operation(
            summary = "Delete a grocery item",
            description = "Removes a grocery item from the specified grocery list."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Grocery item deleted successfully"),
            @ApiResponse(responseCode = "403", description = "Access denied"),
            @ApiResponse(responseCode = "404", description = "Grocery list or item not found")
    })
    @DeleteMapping("/{listId}/items/{itemId}")
    public ResponseEntity<Void> deleteGroceryItem(
            @Parameter(description = "ID of the grocery list", example = "list123")
            @PathVariable String listId,
            @Parameter(description = "ID of the grocery item to delete", example = "item123")
            @PathVariable String itemId,
            @AuthenticationPrincipal UserPrincipal principal) {
        Long authUserId = principal != null ? principal.getUserId() : null;
        groceryListService.deleteGroceryItem(listId, itemId, authUserId);
        return ResponseEntity.noContent().build();
    }

    @Operation(
            summary = "Get estimated cost",
            description = "Calculates the estimated total cost of all items in the grocery list."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Estimated cost calculated successfully",
                    content = @Content(schema = @Schema(implementation = EstimatedCostResponse.class))),
            @ApiResponse(responseCode = "403", description = "Access denied"),
            @ApiResponse(responseCode = "404", description = "Grocery list not found")
    })
    @GetMapping("/{listId}/estimated-cost")
    public ResponseEntity<EstimatedCostResponse> getEstimatedCost(
            @Parameter(description = "ID of the grocery list", example = "list123")
            @PathVariable String listId,
            @AuthenticationPrincipal UserPrincipal principal) {
        Long authUserId = principal != null ? principal.getUserId() : null;
        EstimatedCostResponse response = groceryListService.getEstimatedCost(listId, authUserId);
        return ResponseEntity.ok(response);
    }
}
