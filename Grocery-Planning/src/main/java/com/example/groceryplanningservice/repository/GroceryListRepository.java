package com.example.groceryplanningservice.repository;

import com.example.groceryplanningservice.entity.GroceryList;
import com.example.groceryplanningservice.entity.GroceryListStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * MongoDB repository for GroceryList documents.
 */
@Repository
public interface GroceryListRepository extends MongoRepository<GroceryList, String> {

    /**
     * Find the most recent active grocery list for a given user.
     */
    Optional<GroceryList> findFirstByUserIdAndStatusOrderByCreatedAtDesc(Long userId, GroceryListStatus status);

    /**
     * Find all active grocery lists for a user, ordered by creation time descending.
     */
    List<GroceryList> findAllByUserIdAndStatusOrderByCreatedAtDesc(Long userId, GroceryListStatus status);

    /**
     * Find all grocery lists for a user.
     */
    List<GroceryList> findAllByUserIdOrderByCreatedAtDesc(Long userId);
}
