package com.example.mealplanning.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

/**
 * OpenFeign client for the Food Database Service using Eureka service discovery.
 *
 * Calls: GET http://food-database-service/api/foods/{foodId}
 */
@FeignClient(name = "food-database-service")
public interface FoodServiceClient {

    @GetMapping("/api/foods/{foodId}")
    FoodDto getFoodById(@PathVariable("foodId") String foodId);
}
