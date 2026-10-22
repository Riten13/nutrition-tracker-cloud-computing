package com.example.userprofile.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Document(collection = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    public static final String SEQUENCE_NAME = "users_sequence";

    @Id
    private Long id;

    private String name;

    @Indexed(unique = true)
    private String email;

    private String password;

    private Profile profile;

    @Builder.Default
    private List<Allergy> allergies = new ArrayList<>();

    private DietaryPreference dietaryPreference;

    @Builder.Default
    private String role = "ROLE_USER";

    private NutritionGoal nutritionGoal;
}
