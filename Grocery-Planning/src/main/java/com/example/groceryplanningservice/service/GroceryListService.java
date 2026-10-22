package com.example.groceryplanningservice.service;

import com.example.groceryplanningservice.client.FoodServiceClient;
import com.example.groceryplanningservice.dto.*;
import com.example.groceryplanningservice.entity.GroceryItem;
import com.example.groceryplanningservice.entity.GroceryList;
import com.example.groceryplanningservice.entity.GroceryListStatus;
import com.example.groceryplanningservice.exception.GroceryItemNotFoundException;
import com.example.groceryplanningservice.exception.GroceryListNotFoundException;
import com.example.groceryplanningservice.repository.GroceryItemRepository;
import com.example.groceryplanningservice.repository.GroceryListRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class GroceryListService {

    private final GroceryListRepository groceryListRepository;
    private final GroceryItemRepository groceryItemRepository;
    private final FoodServiceClient foodServiceClient;

    // =========================================================================
    // Grocery List operations
    // =========================================================================

    /**
     * Create an ACTIVE grocery list for a user.
     * If an ACTIVE list already exists, returns the existing list without duplicating.
     */
    public GroceryListResponse createGroceryList(GroceryListRequest request, Long authenticatedUserId) {
        if (authenticatedUserId != null && !request.getUserId().equals(authenticatedUserId)) {
            throw new AccessDeniedException("Access denied: You cannot create a grocery list for another user");
        }

        // Check if an active list already exists
        Optional<GroceryList> existing = groceryListRepository
                .findFirstByUserIdAndStatusOrderByCreatedAtDesc(request.getUserId(), GroceryListStatus.ACTIVE);

        if (existing.isPresent()) {
            GroceryList list = existing.get();
            List<GroceryItem> items = groceryItemRepository.findByGroceryListId(list.getId());
            List<GroceryItemResponse> itemResponses = items.stream()
                    .map(this::toItemResponse)
                    .collect(Collectors.toList());
            GroceryListResponse response = toListResponseWithoutItems(list);
            response.setItems(itemResponses);
            return response;
        }

        GroceryList list = GroceryList.builder()
                .userId(request.getUserId())
                .status(GroceryListStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .build();

        GroceryList saved = groceryListRepository.save(list);
        GroceryListResponse response = toListResponseWithoutItems(saved);
        response.setItems(List.of());
        return response;
    }

    public GroceryListResponse createGroceryList(GroceryListRequest request) {
        return createGroceryList(request, null);
    }

    /**
     * Get the user's ACTIVE grocery list together with all its items.
     * Safely handles duplicate active lists by merging items into the primary list and archiving duplicates.
     */
    public GroceryListResponse getActiveGroceryList(Long userId, Long authenticatedUserId) {
        if (authenticatedUserId != null && !userId.equals(authenticatedUserId)) {
            throw new AccessDeniedException("Access denied: You can only view your own grocery list");
        }

        List<GroceryList> activeLists = groceryListRepository
                .findAllByUserIdAndStatusOrderByCreatedAtDesc(userId, GroceryListStatus.ACTIVE);

        if (activeLists.isEmpty()) {
            throw new GroceryListNotFoundException("No active grocery list found for userId: " + userId);
        }

        // Primary list is the most recently created active list
        GroceryList primaryList = activeLists.get(0);

        // If duplicate active lists exist, safely merge items into primary and archive duplicates
        if (activeLists.size() > 1) {
            log.warn("Found {} active grocery lists for userId {}. Consolidating duplicates safely.", activeLists.size(), userId);
            for (int i = 1; i < activeLists.size(); i++) {
                GroceryList duplicate = activeLists.get(i);
                List<GroceryItem> duplicateItems = groceryItemRepository.findByGroceryListId(duplicate.getId());
                for (GroceryItem item : duplicateItems) {
                    item.setGroceryListId(primaryList.getId());
                    groceryItemRepository.save(item);
                }
                duplicate.setStatus(GroceryListStatus.ARCHIVED);
                groceryListRepository.save(duplicate);
            }
        }

        List<GroceryItem> items = groceryItemRepository.findByGroceryListId(primaryList.getId());
        List<GroceryItemResponse> itemResponses = items.stream()
                .map(this::toItemResponse)
                .collect(Collectors.toList());

        GroceryListResponse response = toListResponseWithoutItems(primaryList);
        response.setItems(itemResponses);
        return response;
    }

    public GroceryListResponse getActiveGroceryList(Long userId) {
        return getActiveGroceryList(userId, null);
    }

    // =========================================================================
    // Grocery Item operations
    // =========================================================================

    public GroceryItemResponse addGroceryItem(String listId, GroceryItemRequest request, Long authenticatedUserId) {
        GroceryList list = groceryListRepository.findById(listId)
                .orElseThrow(() -> new GroceryListNotFoundException(
                        "Grocery list not found with id: " + listId));

        if (authenticatedUserId != null && !list.getUserId().equals(authenticatedUserId)) {
            throw new AccessDeniedException("Access denied: You do not own this grocery list");
        }

        // Validate that the food exists in Food Database Service
        foodServiceClient.getFoodById(request.getFoodId());

        GroceryItem item = GroceryItem.builder()
                .groceryListId(list.getId())
                .foodId(request.getFoodId())
                .quantity(request.getQuantity())
                .unit(request.getUnit())
                .checked(false)
                .estimatedPrice(request.getEstimatedPrice())
                .build();

        GroceryItem saved = groceryItemRepository.save(item);
        return toItemResponse(saved);
    }

    public GroceryItemResponse addGroceryItem(String listId, GroceryItemRequest request) {
        return addGroceryItem(listId, request, null);
    }

    public GroceryItemResponse updateGroceryItem(String listId, String itemId,
                                                 GroceryItemUpdateRequest request,
                                                 Long authenticatedUserId) {
        GroceryList list = groceryListRepository.findById(listId)
                .orElseThrow(() -> new GroceryListNotFoundException(
                        "Grocery list not found with id: " + listId));

        if (authenticatedUserId != null && !list.getUserId().equals(authenticatedUserId)) {
            throw new AccessDeniedException("Access denied: You do not own this grocery list");
        }

        GroceryItem item = groceryItemRepository
                .findByIdAndGroceryListId(itemId, listId)
                .orElseThrow(() -> new GroceryItemNotFoundException(
                        "Grocery item not found with id: " + itemId + " in list: " + listId));

        if (request.getQuantity() != null) {
            item.setQuantity(request.getQuantity());
        }
        if (request.getUnit() != null) {
            item.setUnit(request.getUnit());
        }
        if (request.getChecked() != null) {
            item.setChecked(request.getChecked());
        }
        if (request.getEstimatedPrice() != null) {
            item.setEstimatedPrice(request.getEstimatedPrice());
        }

        GroceryItem updated = groceryItemRepository.save(item);
        return toItemResponse(updated);
    }

    public GroceryItemResponse updateGroceryItem(String listId, String itemId,
                                                 GroceryItemUpdateRequest request) {
        return updateGroceryItem(listId, itemId, request, null);
    }

    public void deleteGroceryItem(String listId, String itemId, Long authenticatedUserId) {
        GroceryList list = groceryListRepository.findById(listId)
                .orElseThrow(() -> new GroceryListNotFoundException(
                        "Grocery list not found with id: " + listId));

        if (authenticatedUserId != null && !list.getUserId().equals(authenticatedUserId)) {
            throw new AccessDeniedException("Access denied: You do not own this grocery list");
        }

        GroceryItem item = groceryItemRepository
                .findByIdAndGroceryListId(itemId, listId)
                .orElseThrow(() -> new GroceryItemNotFoundException(
                        "Grocery item not found with id: " + itemId + " in list: " + listId));

        groceryItemRepository.delete(item);
    }

    public void deleteGroceryItem(String listId, String itemId) {
        deleteGroceryItem(listId, itemId, null);
    }

    // =========================================================================
    // Estimated Cost
    // =========================================================================

    public EstimatedCostResponse getEstimatedCost(String listId, Long authenticatedUserId) {
        GroceryList list = groceryListRepository.findById(listId)
                .orElseThrow(() -> new GroceryListNotFoundException(
                        "Grocery list not found with id: " + listId));

        if (authenticatedUserId != null && !list.getUserId().equals(authenticatedUserId)) {
            throw new AccessDeniedException("Access denied: You do not own this grocery list");
        }

        List<GroceryItem> items = groceryItemRepository.findByGroceryListId(listId);

        BigDecimal total = items.stream()
                .filter(item -> item.getEstimatedPrice() != null)
                .map(item -> item.getEstimatedPrice()
                        .multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return EstimatedCostResponse.builder()
                .listId(listId)
                .estimatedCost(total)
                .build();
    }

    public EstimatedCostResponse getEstimatedCost(String listId) {
        return getEstimatedCost(listId, null);
    }

    // =========================================================================
    // Mappers
    // =========================================================================

    private GroceryListResponse toListResponseWithoutItems(GroceryList list) {
        return GroceryListResponse.builder()
                .id(list.getId())
                .userId(list.getUserId())
                .status(list.getStatus())
                .createdAt(list.getCreatedAt())
                .build();
    }

    private GroceryItemResponse toItemResponse(GroceryItem item) {
        return GroceryItemResponse.builder()
                .id(item.getId())
                .groceryListId(item.getGroceryListId())
                .foodId(item.getFoodId())
                .quantity(item.getQuantity())
                .unit(item.getUnit())
                .checked(item.getChecked())
                .estimatedPrice(item.getEstimatedPrice())
                .build();
    }
}
