package com.example.fooddatabase.repository;

import com.example.fooddatabase.model.Food;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for the "foods" MongoDB collection.
 *
 * Spring Data MongoDB automatically provides:
 *   - findAll()
 *   - findById()
 *   - save()
 *   - deleteById()
 *   - existsById()
 *
 * We add two custom query methods:
 *   - findByNameContainingIgnoreCase: searches foods by partial name (case-insensitive)
 *   - findByCategoryIgnoreCase: filters foods by category (case-insensitive)
 *
 * Spring Data MongoDB generates the actual MongoDB queries from the method names automatically.
 */
@Repository
public interface FoodRepository extends MongoRepository<Food, String> {

    // Search foods where name contains the given string (case-insensitive)
    List<Food> findByNameContainingIgnoreCase(String name);

    // Filter foods by exact category (case-insensitive)
    List<Food> findByCategoryIgnoreCase(String category);

    // Exact check for seeding
    boolean existsByNameIgnoreCase(String name);

    Optional<Food> findByNameIgnoreCase(String name);
}
