package com.example.fooddatabase.config;

import com.example.fooddatabase.model.Food;
import com.example.fooddatabase.model.Nutrition;
import com.example.fooddatabase.repository.FoodRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FoodDataSeederTest {

    @Mock
    private FoodRepository foodRepository;

    @InjectMocks
    private FoodDataSeeder foodDataSeeder;

    @Test
    @DisplayName("FoodDataSeeder saves foods that do not exist yet in database")
    void run_insertsOnlyNonExistingFoods() {
        // Assume Whole Wheat Roti is already in database with portion weights
        Food existingRoti = Food.builder()
                .name("Whole Wheat Roti (Chapati)")
                .nutrition(Nutrition.builder().servingWeightGrams(35.0).build())
                .build();
        when(foodRepository.findByNameIgnoreCase(eq("Whole Wheat Roti (Chapati)"))).thenReturn(Optional.of(existingRoti));

        // All other foods are not found in DB
        when(foodRepository.findByNameIgnoreCase(argThat(name -> !name.equals("Whole Wheat Roti (Chapati)"))))
                .thenReturn(Optional.empty());

        foodDataSeeder.run();

        // Ensure Roti with servingWeightGrams was not saved again
        verify(foodRepository, never()).save(argThat(f -> f != null && f.getName().equals("Whole Wheat Roti (Chapati)")));
        // Other items (34 remaining) were saved
        verify(foodRepository, times(34)).save(any(Food.class));
    }

    @Test
    @DisplayName("FoodDataSeeder enriches existing foods missing serving portion weights")
    void run_enrichesExistingFoodsMissingPortions() {
        // Food exists but has no servingWeightGrams
        Food legacyFood = Food.builder()
                .name("Whole Wheat Roti (Chapati)")
                .nutrition(Nutrition.builder().servingWeightGrams(null).build())
                .build();
        when(foodRepository.findByNameIgnoreCase(eq("Whole Wheat Roti (Chapati)"))).thenReturn(Optional.of(legacyFood));

        // Other foods exist with portions
        Food fullyConfigured = Food.builder()
                .name("Other Food")
                .nutrition(Nutrition.builder().servingWeightGrams(100.0).build())
                .build();
        when(foodRepository.findByNameIgnoreCase(argThat(name -> !name.equals("Whole Wheat Roti (Chapati)"))))
                .thenReturn(Optional.of(fullyConfigured));

        foodDataSeeder.run();

        // Roti must be saved with enriched serving portion weight
        verify(foodRepository, times(1)).save(legacyFood);
    }

    @Test
    @DisplayName("FoodDataSeeder does nothing if all foods already exist with portion data")
    void run_skipsAllWhenAlreadySeeded() {
        Food completeFood = Food.builder()
                .name("Any Food")
                .nutrition(Nutrition.builder().servingWeightGrams(100.0).build())
                .build();
        when(foodRepository.findByNameIgnoreCase(anyString())).thenReturn(Optional.of(completeFood));

        foodDataSeeder.run();

        verify(foodRepository, never()).save(any(Food.class));
    }

    @Test
    @DisplayName("FoodDataSeeder preserves existing imageKey when updating food")
    void run_preservesExistingImageKey() {
        Food existingFoodWithImage = Food.builder()
                .name("Whole Wheat Roti (Chapati)")
                .imageKey("food-images/roti_custom_key_123.jpg")
                .nutrition(Nutrition.builder().servingWeightGrams(null).build())
                .build();

        when(foodRepository.findByNameIgnoreCase(eq("Whole Wheat Roti (Chapati)")))
                .thenReturn(Optional.of(existingFoodWithImage));

        // Other foods exist with portions
        Food fullyConfigured = Food.builder()
                .name("Other Food")
                .nutrition(Nutrition.builder().servingWeightGrams(100.0).build())
                .build();
        when(foodRepository.findByNameIgnoreCase(argThat(name -> !name.equals("Whole Wheat Roti (Chapati)"))))
                .thenReturn(Optional.of(fullyConfigured));

        foodDataSeeder.run();

        // Verify save was called and imageKey was preserved
        verify(foodRepository).save(argThat(f ->
                f.getName().equals("Whole Wheat Roti (Chapati)") &&
                "food-images/roti_custom_key_123.jpg".equals(f.getImageKey())
        ));
    }
}

