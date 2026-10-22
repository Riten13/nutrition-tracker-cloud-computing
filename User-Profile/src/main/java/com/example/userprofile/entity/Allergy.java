package com.example.userprofile.entity;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Allergy {

    public static final String SEQUENCE_NAME = "allergies_sequence";

    private Long id;

    private String name;
}
