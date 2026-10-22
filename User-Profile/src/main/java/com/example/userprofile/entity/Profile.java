package com.example.userprofile.entity;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Profile {

    private Integer age;

    private Double weight;

    private Double height;

    private String activityLevel;
}
