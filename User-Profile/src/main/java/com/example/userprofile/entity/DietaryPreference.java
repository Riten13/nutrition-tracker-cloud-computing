package com.example.userprofile.entity;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DietaryPreference {

    private Boolean vegan;

    private Boolean vegetarian;

    private Boolean keto;

    private Boolean glutenFree;

    private Boolean dairyFree;
}
