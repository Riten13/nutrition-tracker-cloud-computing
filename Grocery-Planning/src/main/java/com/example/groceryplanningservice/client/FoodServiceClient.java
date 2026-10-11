package com.example.groceryplanningservice.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

/**
 * OpenFeign client for communicating with the Food Database Service using Eureka service discovery.
 *
 * <p>This client fetches minimal food information (id, name, category) when a
 * grocery item is added. Nutrition data is intentionally not imported.
 */
@FeignClient(name = "food-database-service")
public interface FoodServiceClient {

    /**
     * Retrieve a food by its ID from the Food Database Service.
     *
     * @param foodId the food's unique identifier
     * @return minimal food information (id, name, category)
     */
    @GetMapping("/api/foods/{foodId}")
    FoodResponse getFoodById(@PathVariable("foodId") String foodId);
}
