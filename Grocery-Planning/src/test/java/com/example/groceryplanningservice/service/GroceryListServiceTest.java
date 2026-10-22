package com.example.groceryplanningservice.service;

import com.example.groceryplanningservice.client.FoodServiceClient;
import com.example.groceryplanningservice.dto.GroceryListRequest;
import com.example.groceryplanningservice.dto.GroceryListResponse;
import com.example.groceryplanningservice.entity.GroceryItem;
import com.example.groceryplanningservice.entity.GroceryList;
import com.example.groceryplanningservice.entity.GroceryListStatus;
import com.example.groceryplanningservice.repository.GroceryItemRepository;
import com.example.groceryplanningservice.repository.GroceryListRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GroceryListServiceTest {

    @Mock
    private GroceryListRepository groceryListRepository;

    @Mock
    private GroceryItemRepository groceryItemRepository;

    @Mock
    private FoodServiceClient foodServiceClient;

    @InjectMocks
    private GroceryListService groceryListService;

    private Long userId = 202L;

    @Test
    @DisplayName("createGroceryList creates a new active list when none exists")
    void createGroceryList_whenNoActiveList_createsNew() {
        GroceryListRequest request = new GroceryListRequest();
        request.setUserId(userId);

        when(groceryListRepository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, GroceryListStatus.ACTIVE))
                .thenReturn(Optional.empty());

        GroceryList saved = GroceryList.builder()
                .id("list-1")
                .userId(userId)
                .status(GroceryListStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .build();
        when(groceryListRepository.save(any(GroceryList.class))).thenReturn(saved);

        GroceryListResponse response = groceryListService.createGroceryList(request, userId);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo("list-1");
        assertThat(response.getStatus()).isEqualTo(GroceryListStatus.ACTIVE);
        verify(groceryListRepository, times(1)).save(any(GroceryList.class));
    }

    @Test
    @DisplayName("createGroceryList returns existing active list if one already exists (prevents duplicate active lists)")
    void createGroceryList_whenActiveListExists_returnsExisting() {
        GroceryListRequest request = new GroceryListRequest();
        request.setUserId(userId);

        GroceryList existing = GroceryList.builder()
                .id("list-existing")
                .userId(userId)
                .status(GroceryListStatus.ACTIVE)
                .createdAt(LocalDateTime.now().minusDays(1))
                .build();

        when(groceryListRepository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, GroceryListStatus.ACTIVE))
                .thenReturn(Optional.of(existing));
        when(groceryItemRepository.findByGroceryListId("list-existing")).thenReturn(List.of());

        GroceryListResponse response = groceryListService.createGroceryList(request, userId);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo("list-existing");
        verify(groceryListRepository, never()).save(any(GroceryList.class));
    }

    @Test
    @DisplayName("getActiveGroceryList safely merges items and archives duplicates when duplicate active lists exist")
    void getActiveGroceryList_whenDuplicatesExist_mergesAndArchivesSafely() {
        GroceryList primaryList = GroceryList.builder()
                .id("list-newest")
                .userId(userId)
                .status(GroceryListStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .build();

        GroceryList duplicateList = GroceryList.builder()
                .id("list-older")
                .userId(userId)
                .status(GroceryListStatus.ACTIVE)
                .createdAt(LocalDateTime.now().minusHours(2))
                .build();

        when(groceryListRepository.findAllByUserIdAndStatusOrderByCreatedAtDesc(userId, GroceryListStatus.ACTIVE))
                .thenReturn(List.of(primaryList, duplicateList));

        GroceryItem itemOnOldList = GroceryItem.builder()
                .id("item-old")
                .groceryListId("list-older")
                .foodId("food-1")
                .quantity(2.0)
                .build();

        when(groceryItemRepository.findByGroceryListId("list-older")).thenReturn(List.of(itemOnOldList));
        when(groceryItemRepository.findByGroceryListId("list-newest")).thenReturn(List.of(itemOnOldList));

        GroceryListResponse response = groceryListService.getActiveGroceryList(userId, userId);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo("list-newest");

        // Verify the item was reassigned to the primary list
        verify(groceryItemRepository, times(1)).save(itemOnOldList);
        assertThat(itemOnOldList.getGroceryListId()).isEqualTo("list-newest");

        // Verify duplicate list was archived
        assertThat(duplicateList.getStatus()).isEqualTo(GroceryListStatus.ARCHIVED);
        verify(groceryListRepository, times(1)).save(duplicateList);
    }

    @Test
    @DisplayName("createGroceryList throws AccessDeniedException when authenticated user attempts IDOR")
    void createGroceryList_whenForeignUser_throwsAccessDenied() {
        GroceryListRequest request = new GroceryListRequest();
        request.setUserId(userId);

        Long maliciousCallerId = 999L;
        assertThatThrownBy(() -> groceryListService.createGroceryList(request, maliciousCallerId))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("You cannot create a grocery list for another user");
    }
}
