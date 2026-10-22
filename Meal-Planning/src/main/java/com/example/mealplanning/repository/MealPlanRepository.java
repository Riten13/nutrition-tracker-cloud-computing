package com.example.mealplanning.repository;

import com.example.mealplanning.entity.MealPlan;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface MealPlanRepository extends MongoRepository<MealPlan, String> {

    Optional<MealPlan> findByUserIdAndPlanDate(Long userId, LocalDate planDate);

    List<MealPlan> findByUserId(Long userId);

    List<MealPlan> findAllByUserIdOrderByPlanDateDesc(Long userId);

    Optional<MealPlan> findFirstByUserIdOrderByPlanDateDesc(Long userId);

    List<MealPlan> findAllByUserIdAndPlanDateBetweenOrderByPlanDateAsc(Long userId, LocalDate startDate, LocalDate endDate);
}
