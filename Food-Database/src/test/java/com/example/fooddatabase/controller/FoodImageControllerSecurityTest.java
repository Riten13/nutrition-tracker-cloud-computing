package com.example.fooddatabase.controller;

import com.example.fooddatabase.dto.FoodResponse;
import com.example.fooddatabase.security.JwtAuthenticationFilter;
import com.example.fooddatabase.security.JwtUtils;
import com.example.fooddatabase.security.SecurityConfig;
import com.example.fooddatabase.service.FoodService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(FoodController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class FoodImageControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private FoodService foodService;

    @MockBean
    private JwtUtils jwtUtils;

    @Test
    @DisplayName("Public GET /api/foods is accessible without authentication")
    void getFoods_publicAccess_returnsOk() throws Exception {
        when(foodService.getFoods(null, null)).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/foods"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST /api/foods/{id}/image without authentication returns 401")
    void uploadImage_unauthenticated_returns401() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "image", "test.jpg", "image/jpeg", new byte[]{1, 2, 3}
        );

        mockMvc.perform(multipart("/api/foods/food-1/image").file(file))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "regularUser", roles = {"USER"})
    @DisplayName("POST /api/foods/{id}/image with ROLE_USER is authorized")
    void uploadImage_withRoleUser_returnsOk() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "image", "test.jpg", "image/jpeg", new byte[]{1, 2, 3}
        );

        FoodResponse mockResponse = FoodResponse.builder()
                .id("food-1")
                .name("Oats")
                .imageKey("food-images/food-1_test.jpg")
                .imageUrl("https://s3.ap-southeast-2.amazonaws.com/test.jpg")
                .build();

        when(foodService.uploadFoodImage(eq("food-1"), any())).thenReturn(mockResponse);

        mockMvc.perform(multipart("/api/foods/food-1/image").file(file))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "adminUser", roles = {"ADMIN"})
    @DisplayName("POST /api/foods/{id}/image with ROLE_ADMIN is authorized")
    void uploadImage_withRoleAdmin_returnsOk() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "image", "test.jpg", "image/jpeg", new byte[]{1, 2, 3}
        );

        FoodResponse mockResponse = FoodResponse.builder()
                .id("food-1")
                .name("Oats")
                .imageKey("food-images/food-1_test.jpg")
                .imageUrl("https://s3.ap-southeast-2.amazonaws.com/test.jpg")
                .build();

        when(foodService.uploadFoodImage(eq("food-1"), any())).thenReturn(mockResponse);

        mockMvc.perform(multipart("/api/foods/food-1/image").file(file))
                .andExpect(status().isOk());
    }
}
