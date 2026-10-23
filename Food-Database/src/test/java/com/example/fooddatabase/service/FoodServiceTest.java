package com.example.fooddatabase.service;

import com.example.fooddatabase.dto.FoodRequest;
import com.example.fooddatabase.dto.FoodResponse;
import com.example.fooddatabase.dto.NutritionDto;
import com.example.fooddatabase.exception.FoodNotFoundException;
import com.example.fooddatabase.model.Food;
import com.example.fooddatabase.model.Nutrition;
import com.example.fooddatabase.repository.FoodRepository;
import com.example.fooddatabase.util.ImageValidator;
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

    @Mock
    private S3StorageService s3StorageService;

    @Mock
    private ImageValidator imageValidator;

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

    @Test
    @DisplayName("uploadFoodImage uploads to S3, updates MongoDB, and returns presigned URL")
    void uploadFoodImage_success() throws Exception {
        Food existingFood = Food.builder()
                .id("food-1")
                .name("Oats")
                .imageKey(null)
                .build();

        when(foodRepository.findById("food-1")).thenReturn(Optional.of(existingFood));

        org.springframework.web.multipart.MultipartFile mockFile = mock(org.springframework.web.multipart.MultipartFile.class);
        byte[] fakeJpgBytes = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x01, 0x02};
        when(mockFile.getBytes()).thenReturn(fakeJpgBytes);

        when(imageValidator.validate(mockFile)).thenReturn(ImageValidator.SupportedFormat.JPEG);
        when(foodRepository.save(any(Food.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(s3StorageService.generatePresignedUrl(anyString())).thenReturn("https://s3.ap-southeast-2.amazonaws.com/nutrition-tracker-food-images-2026-new/food-images/test.jpg");

        FoodResponse response = foodService.uploadFoodImage("food-1", mockFile);

        assertThat(response).isNotNull();
        assertThat(response.getImageKey()).startsWith("food-images/food-1_");
        assertThat(response.getImageKey()).endsWith(".jpg");
        assertThat(response.getImageUrl()).contains("https://s3.ap-southeast-2.amazonaws.com");

        verify(s3StorageService).uploadImage(eq(response.getImageKey()), eq(fakeJpgBytes), eq("image/jpeg"));
        verify(foodRepository).save(argThat(f -> f.getImageKey().equals(response.getImageKey())));
    }

    @Test
    @DisplayName("uploadFoodImage deletes old image only after successful DB save")
    void uploadFoodImage_replacesOldImageAfterSave() throws Exception {
        Food existingFood = Food.builder()
                .id("food-1")
                .name("Oats")
                .imageKey("food-images/old_key.png")
                .build();

        when(foodRepository.findById("food-1")).thenReturn(Optional.of(existingFood));

        org.springframework.web.multipart.MultipartFile mockFile = mock(org.springframework.web.multipart.MultipartFile.class);
        byte[] fakeJpgBytes = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x01};
        when(mockFile.getBytes()).thenReturn(fakeJpgBytes);

        when(imageValidator.validate(mockFile)).thenReturn(ImageValidator.SupportedFormat.JPEG);
        when(foodRepository.save(any(Food.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FoodResponse response = foodService.uploadFoodImage("food-1", mockFile);

        assertThat(response.getImageKey()).isNotEqualTo("food-images/old_key.png");
        verify(s3StorageService).deleteImage("food-images/old_key.png");
    }

    @Test
    @DisplayName("uploadFoodImage cleans up new S3 object if MongoDB save fails")
    void uploadFoodImage_cleansUpNewImageWhenDbSaveFails() throws Exception {
        Food existingFood = Food.builder()
                .id("food-1")
                .name("Oats")
                .imageKey("food-images/original_key.png")
                .build();

        when(foodRepository.findById("food-1")).thenReturn(Optional.of(existingFood));

        org.springframework.web.multipart.MultipartFile mockFile = mock(org.springframework.web.multipart.MultipartFile.class);
        byte[] fakeJpgBytes = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
        when(mockFile.getBytes()).thenReturn(fakeJpgBytes);

        when(imageValidator.validate(mockFile)).thenReturn(ImageValidator.SupportedFormat.JPEG);
        when(foodRepository.save(any(Food.class))).thenThrow(new RuntimeException("MongoDB connection timeout"));

        assertThatThrownBy(() -> foodService.uploadFoodImage("food-1", mockFile))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("MongoDB connection timeout");

        // Verify newly uploaded key was cleaned up from S3
        verify(s3StorageService).deleteImage(argThat(key -> key.startsWith("food-images/food-1_")));
        // Verify original key was NOT deleted
        verify(s3StorageService, never()).deleteImage("food-images/original_key.png");
    }

    @Test
    @DisplayName("deleteFoodImage removes object from S3 and clears imageKey in MongoDB")
    void deleteFoodImage_success() {
        Food foodWithImage = Food.builder()
                .id("food-1")
                .name("Oats")
                .imageKey("food-images/oats_123.jpg")
                .build();

        when(foodRepository.findById("food-1")).thenReturn(Optional.of(foodWithImage));
        when(foodRepository.save(any(Food.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FoodResponse response = foodService.deleteFoodImage("food-1");

        assertThat(response.getImageKey()).isNull();
        assertThat(response.getImageUrl()).isNull();
        verify(s3StorageService).deleteImage("food-images/oats_123.jpg");
        verify(foodRepository).save(argThat(f -> f.getImageKey() == null));
    }

    @Test
    @DisplayName("deleteFood cascades deletion to S3 when food has imageKey")
    void deleteFood_cascadesS3Deletion() {
        Food foodWithImage = Food.builder()
                .id("food-1")
                .name("Oats")
                .imageKey("food-images/oats_123.jpg")
                .build();

        when(foodRepository.findById("food-1")).thenReturn(Optional.of(foodWithImage));

        foodService.deleteFood("food-1");

        verify(s3StorageService).deleteImage("food-images/oats_123.jpg");
        verify(foodRepository).deleteById("food-1");
    }
}
