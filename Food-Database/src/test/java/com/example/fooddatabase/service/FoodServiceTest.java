package com.example.fooddatabase.service;

import com.example.fooddatabase.dto.FoodRequest;
import com.example.fooddatabase.dto.FoodResponse;
import com.example.fooddatabase.dto.NutritionDto;
import com.example.fooddatabase.exception.FoodNotFoundException;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FoodServiceTest {

    @Mock
    private FoodRepository foodRepository;

    @InjectMocks
    private FoodService foodService;

    @Test
    @DisplayName("createFood preserves servingWeightGrams and portion metadata")
    void createFood_preservesServingWeightGrams() {
        NutritionDto nutritionDto = NutritionDto.builder()
                .calories(297.0)
                .protein(9.0)
                .carbs(60.0)
                .fat(3.0)
                .servingSize(1.0)
                .servingUnit("piece")
                .servingWeightGrams(35.0)
                .build();

        FoodRequest request = FoodRequest.builder()
                .name("Roti / Chapati")
                .category("Grains")
                .description("Whole wheat flatbread")
                .nutrition(nutritionDto)
                .build();

        Food savedFood = Food.builder()
                .id("food-roti-1")
                .name("Roti / Chapati")
                .category("Grains")
                .description("Whole wheat flatbread")
                .nutrition(Nutrition.builder()
                        .calories(297.0)
                        .protein(9.0)
                        .carbs(60.0)
                        .fat(3.0)
                        .servingSize(1.0)
                        .servingUnit("piece")
                        .servingWeightGrams(35.0)
                        .build())
                .build();

        when(foodRepository.save(any(Food.class))).thenReturn(savedFood);

        FoodResponse response = foodService.addFood(request);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo("food-roti-1");
        assertThat(response.getNutrition()).isNotNull();
        assertThat(response.getNutrition().getServingUnit()).isEqualTo("piece");
        assertThat(response.getNutrition().getServingWeightGrams()).isEqualTo(35.0);
        verify(foodRepository, times(1)).save(any(Food.class));
    }

    @Test
    @DisplayName("getFoodById returns food with portion conversion data")
    void getFoodById_returnsFoodWithPortions() {
        Food food = Food.builder()
                .id("food-dal-1")
                .name("Dal Tadka")
                .category("Lentils")
                .nutrition(Nutrition.builder()
                        .calories(120.0)
                        .protein(7.0)
                        .carbs(17.0)
                        .fat(3.0)
                        .servingSize(1.0)
                        .servingUnit("bowl")
                        .servingWeightGrams(150.0)
                        .build())
                .build();

        when(foodRepository.findById("food-dal-1")).thenReturn(Optional.of(food));

        FoodResponse response = foodService.getFoodById("food-dal-1");

        assertThat(response).isNotNull();
        assertThat(response.getName()).isEqualTo("Dal Tadka");
        assertThat(response.getNutrition().getServingUnit()).isEqualTo("bowl");
        assertThat(response.getNutrition().getServingWeightGrams()).isEqualTo(150.0);
    }

    @Test
    @DisplayName("getFoodById throws FoodNotFoundException when food does not exist")
    void getFoodById_whenNotFound_throwsException() {
        when(foodRepository.findById("non-existent")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> foodService.getFoodById("non-existent"))
                .isInstanceOf(FoodNotFoundException.class)
                .hasMessageContaining("Food not found with id: non-existent");
    }
}
