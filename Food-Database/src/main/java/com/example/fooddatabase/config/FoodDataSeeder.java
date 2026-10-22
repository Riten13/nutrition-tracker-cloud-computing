package com.example.fooddatabase.config;

import com.example.fooddatabase.model.Food;
import com.example.fooddatabase.model.Nutrition;
import com.example.fooddatabase.repository.FoodRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * Idempotent seeder that populates common and Indian staple food items
 * with documented nutritional values per 100g (Indian Food Composition Tables / USDA)
 * and realistic serving portion weights for conversions.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class FoodDataSeeder implements CommandLineRunner {

    private final FoodRepository foodRepository;

    @Override
    public void run(String... args) {
        log.info("Checking Food Database seed data...");
        List<Food> seedFoods = getSeedFoodList();

        int seededCount = 0;
        int updatedCount = 0;
        for (Food food : seedFoods) {
            Optional<Food> existingOpt = foodRepository.findByNameIgnoreCase(food.getName());
            if (existingOpt.isEmpty()) {
                foodRepository.save(food);
                seededCount++;
            } else {
                Food existing = existingOpt.get();
                if (existing.getNutrition() != null && existing.getNutrition().getServingWeightGrams() == null) {
                    existing.getNutrition().setServingSize(food.getNutrition().getServingSize());
                    existing.getNutrition().setServingUnit(food.getNutrition().getServingUnit());
                    existing.getNutrition().setServingWeightGrams(food.getNutrition().getServingWeightGrams());
                    foodRepository.save(existing);
                    updatedCount++;
                }
            }
        }

        if (seededCount > 0) {
            log.info("Successfully seeded {} new food items into Food Database.", seededCount);
        } else if (updatedCount > 0) {
            log.info("Updated {} existing food items with serving portion weights.", updatedCount);
        } else {
            log.info("Food Database already contains seed items. No new items inserted.");
        }
    }

    private List<Food> getSeedFoodList() {
        return List.of(
            createFood("Whole Wheat Roti (Chapati)", "Grains", "Traditional unleavened Indian flatbread cooked on tawa", 1, "piece", 35.0, 297, 10.5, 55.7, 3.7, 11.2),
            createFood("Cooked White Rice", "Grains", "Steamed medium grain polished white rice", 1, "cup / bowl", 150.0, 130, 2.7, 28.2, 0.3, 0.4),
            createFood("Cooked Brown Rice", "Grains", "Steamed whole grain brown rice", 1, "cup / bowl", 150.0, 111, 2.6, 23.0, 0.9, 1.8),
            createFood("Rolled Oats (Raw)", "Grains", "Whole grain rolled oats", 1, "cup", 80.0, 389, 16.9, 66.3, 6.9, 10.6),
            createFood("Yellow Moong Dal (Cooked)", "Legumes", "Split yellow gram cooked with turmeric and mild cumin tempering", 1, "bowl / katori", 150.0, 105, 7.0, 17.5, 1.2, 3.8),
            createFood("Toor Dal (Cooked)", "Legumes", "Pigeon pea lentil soup cooked with tomatoes and spices", 1, "bowl / katori", 150.0, 118, 7.2, 20.0, 1.5, 4.5),
            createFood("Chana Masala (Cooked)", "Legumes", "Spiced chickpea curry prepared in an onion-tomato gravy", 1, "bowl / katori", 180.0, 164, 8.9, 27.4, 2.6, 7.6),
            createFood("Rajma (Red Kidney Beans)", "Legumes", "North Indian style simmered kidney beans in rich spiced gravy", 1, "bowl / katori", 180.0, 127, 8.7, 22.8, 0.5, 6.4),
            createFood("Paneer (Fresh Cottage Cheese)", "Dairy", "Fresh non-aged acid-set Indian cheese", 1, "serving / slab", 100.0, 265, 18.3, 3.4, 20.8, 0.0),
            createFood("Plain Curd (Dahi)", "Dairy", "Traditional Indian cultured yogurt", 1, "cup / bowl", 150.0, 61, 3.5, 4.7, 3.3, 0.0),
            createFood("Cow Milk (Whole)", "Dairy", "Pasteurized whole cow milk", 1, "glass (250ml)", 250.0, 61, 3.2, 4.8, 3.3, 0.0),
            createFood("Poha (Cooked)", "Breakfast", "Flattened rice cooked with mustard seeds, curry leaves, onions, and peanuts", 1, "plate / bowl", 150.0, 130, 2.5, 25.0, 2.2, 1.5),
            createFood("Idli (Steamed)", "Breakfast", "Fermented rice and black gram steamed cakes", 1, "piece", 50.0, 136, 4.2, 27.5, 0.8, 2.0),
            createFood("Plain Dosa", "Breakfast", "Crisp fermented rice and lentil crepe made on griddle", 1, "piece", 80.0, 168, 3.9, 29.2, 3.7, 1.6),
            createFood("Upma (Semolina Cooked)", "Breakfast", "Dry roasted semolina porridge cooked with vegetables and mild spices", 1, "bowl", 150.0, 145, 3.2, 24.5, 4.1, 1.8),
            createFood("Boiled Egg", "Poultry", "Whole large chicken egg hard-boiled", 1, "piece", 50.0, 155, 12.6, 1.1, 10.6, 0.0),
            createFood("Egg Bhurji (Scrambled)", "Poultry", "Indian spiced scrambled eggs with sautéed onions, tomatoes, and cilantro", 1, "serving (2 eggs)", 100.0, 168, 11.2, 3.2, 12.1, 0.8),
            createFood("Chicken Breast (Grilled)", "Poultry", "Skinless boneless chicken breast grilled with salt and herbs", 1, "breast fillet", 150.0, 165, 31.0, 0.0, 3.6, 0.0),
            createFood("Chicken Curry", "Poultry", "Homestyle chicken pieces simmered in an aromatic masala gravy", 1, "bowl / serving", 180.0, 140, 15.5, 3.5, 7.2, 1.1),
            createFood("Fish Curry (Rohu)", "Seafood", "Freshwater fish cooked in a tangy mustard and tomato gravy", 1, "serving / piece", 150.0, 125, 16.0, 2.5, 5.8, 0.5),
            createFood("Aloo Gobi (Dry Sabzi)", "Vegetables", "Potatoes and cauliflower florets sautéed with turmeric and coriander", 1, "bowl / katori", 130.0, 85, 2.1, 12.4, 3.2, 2.8),
            createFood("Palak Paneer", "Vegetables", "Cubes of cottage cheese in a rich puréed spinach sauce", 1, "bowl / katori", 160.0, 155, 7.8, 5.2, 11.5, 3.0),
            createFood("Bhindi Masala (Okra)", "Vegetables", "Sliced tender okra tossed with onions, mango powder, and cumin", 1, "bowl / katori", 120.0, 78, 2.0, 8.5, 4.2, 3.2),
            createFood("Steamed Broccoli", "Vegetables", "Fresh broccoli florets steamed until tender-crisp", 1, "cup florets", 90.0, 35, 2.4, 7.2, 0.4, 2.6),
            createFood("Cucumber (Raw)", "Vegetables", "Fresh sliced crisp cucumber with peel", 1, "medium", 200.0, 15, 0.7, 3.6, 0.1, 0.5),
            createFood("Fresh Tomato", "Vegetables", "Ripe red garden tomatoes raw", 1, "medium", 123.0, 18, 0.9, 3.9, 0.2, 1.2),
            createFood("Boiled Potato", "Vegetables", "Peeled potato boiled without salt", 1, "medium", 150.0, 87, 1.9, 20.1, 0.1, 1.8),
            createFood("Banana (Fresh)", "Fruits", "Ripe sweet yellow banana", 1, "medium", 118.0, 89, 1.1, 22.8, 0.3, 2.6),
            createFood("Apple (Fresh with Peel)", "Fruits", "Crisp fresh apple raw", 1, "medium", 182.0, 52, 0.3, 13.8, 0.2, 2.4),
            createFood("Papaya (Ripe)", "Fruits", "Sweet orange papaya slices", 1, "cup sliced", 145.0, 43, 0.5, 10.8, 0.3, 1.7),
            createFood("Mango (Fresh)", "Fruits", "Sweet ripe Alphonso mango slices", 1, "cup sliced", 165.0, 60, 0.8, 15.0, 0.4, 1.6),
            createFood("Almonds (Raw)", "Nuts & Seeds", "Whole raw unroasted almonds", 10, "pieces", 12.0, 579, 21.2, 21.6, 49.9, 12.5),
            createFood("Walnuts (Raw)", "Nuts & Seeds", "Raw shelled walnut halves", 7, "halves", 14.0, 654, 15.2, 13.7, 65.2, 6.7),
            createFood("Peanut Butter (Unsweetened)", "Nuts & Seeds", "Natural roasted ground peanut butter", 1, "tablespoon", 16.0, 588, 25.1, 20.0, 50.4, 6.0),
            createFood("Masala Chai (with Milk)", "Beverages", "Spiced black tea brewed with whole milk and mild sugar", 1, "cup (150ml)", 150.0, 55, 1.8, 7.5, 2.0, 0.0)
        );
    }

    private Food createFood(String name, String category, String description,
                            double servingSize, String servingUnit, Double servingWeightGrams,
                            double calories, double protein, double carbs, double fat, double fiber) {
        return Food.builder()
                .name(name)
                .category(category)
                .description(description)
                .nutrition(Nutrition.builder()
                        .servingSize(servingSize)
                        .servingUnit(servingUnit)
                        .servingWeightGrams(servingWeightGrams)
                        .calories(calories)
                        .protein(protein)
                        .carbs(carbs)
                        .fat(fat)
                        .fiber(fiber)
                        .build())
                .build();
    }
}
