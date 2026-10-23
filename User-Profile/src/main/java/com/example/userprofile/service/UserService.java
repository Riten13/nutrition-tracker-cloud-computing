package com.example.userprofile.service;

import com.example.userprofile.dto.*;
import com.example.userprofile.entity.Allergy;
import com.example.userprofile.entity.DietaryPreference;
import com.example.userprofile.entity.NutritionGoal;
import com.example.userprofile.entity.Profile;
import com.example.userprofile.entity.User;
import com.example.userprofile.exception.ResourceNotFoundException;
import com.example.userprofile.exception.UnauthorizedAccessException;
import com.example.userprofile.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final SequenceGeneratorService sequenceGeneratorService;

    private User getAuthenticatedUserAndVerifyOwnership(Long userId, String authEmail) {
        User user = userRepository.findByEmail(authEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));

        if (!user.getId().equals(userId)) {
            throw new UnauthorizedAccessException("Access Denied: You are not authorized to access user ID " + userId);
        }
        return user;
    }

    public UserProfileResponse getUserProfile(Long userId, String authEmail) {
        User user = getAuthenticatedUserAndVerifyOwnership(userId, authEmail);

        ProfileDto profileDto = user.getProfile() != null ? ProfileDto.builder()
                .age(user.getProfile().getAge())
                .weight(user.getProfile().getWeight())
                .height(user.getProfile().getHeight())
                .activityLevel(user.getProfile().getActivityLevel())
                .build() : null;

        List<AllergyDto> allergyDtos = user.getAllergies() != null ? user.getAllergies().stream()
                .map(a -> AllergyDto.builder().id(a.getId()).name(a.getName()).build())
                .collect(Collectors.toList()) : Collections.emptyList();

        DietaryPreferenceDto prefDto = user.getDietaryPreference() != null ? DietaryPreferenceDto.builder()
                .vegan(user.getDietaryPreference().getVegan())
                .vegetarian(user.getDietaryPreference().getVegetarian())
                .keto(user.getDietaryPreference().getKeto())
                .glutenFree(user.getDietaryPreference().getGlutenFree())
                .dairyFree(user.getDietaryPreference().getDairyFree())
                .build() : null;

        NutritionGoalDto goalDto = user.getNutritionGoal() != null ? NutritionGoalDto.builder()
                .fitnessGoal(user.getNutritionGoal().getFitnessGoal())
                .calorieTarget(user.getNutritionGoal().getCalorieTarget())
                .proteinTarget(user.getNutritionGoal().getProteinTarget())
                .carbTarget(user.getNutritionGoal().getCarbTarget())
                .fatTarget(user.getNutritionGoal().getFatTarget())
                .build() : null;

        return UserProfileResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .profile(profileDto)
                .allergies(allergyDtos)
                .dietaryPreference(prefDto)
                .nutritionGoal(goalDto)
                .role(user.getRole())
                .build();
    }

    public ProfileDto updateProfile(Long userId, ProfileDto profileDto, String authEmail) {
        User user = getAuthenticatedUserAndVerifyOwnership(userId, authEmail);

        Profile profile = user.getProfile();
        if (profile == null) {
            profile = new Profile();
            user.setProfile(profile);
        }

        profile.setAge(profileDto.getAge());
        profile.setWeight(profileDto.getWeight());
        profile.setHeight(profileDto.getHeight());
        profile.setActivityLevel(profileDto.getActivityLevel());

        userRepository.save(user);

        return ProfileDto.builder()
                .age(profile.getAge())
                .weight(profile.getWeight())
                .height(profile.getHeight())
                .activityLevel(profile.getActivityLevel())
                .build();
    }

    public AllergyDto addAllergy(Long userId, AllergyDto allergyDto, String authEmail) {
        User user = getAuthenticatedUserAndVerifyOwnership(userId, authEmail);

        if (user.getAllergies() == null) {
            user.setAllergies(new ArrayList<>());
        }

        long allergyId = sequenceGeneratorService.generateSequence(Allergy.SEQUENCE_NAME);
        Allergy allergy = Allergy.builder()
                .id(allergyId)
                .name(allergyDto.getName())
                .build();

        user.getAllergies().add(allergy);
        userRepository.save(user);

        return AllergyDto.builder()
                .id(allergy.getId())
                .name(allergy.getName())
                .build();
    }

    public List<AllergyDto> getAllergies(Long userId, String authEmail) {
        User user = getAuthenticatedUserAndVerifyOwnership(userId, authEmail);

        if (user.getAllergies() == null) {
            return Collections.emptyList();
        }

        return user.getAllergies().stream()
                .map(a -> AllergyDto.builder().id(a.getId()).name(a.getName()).build())
                .collect(Collectors.toList());
    }

    public void deleteAllergy(Long userId, Long allergyId, String authEmail) {
        User user = getAuthenticatedUserAndVerifyOwnership(userId, authEmail);

        if (user.getAllergies() == null || user.getAllergies().isEmpty()) {
            throw new ResourceNotFoundException("Allergy not found with ID: " + allergyId);
        }

        boolean removed = user.getAllergies().removeIf(a -> a.getId().equals(allergyId));
        if (!removed) {
            throw new ResourceNotFoundException("Allergy not found with ID: " + allergyId);
        }

        userRepository.save(user);
    }

    public DietaryPreferenceDto updateDietaryPreference(Long userId, DietaryPreferenceDto preferenceDto, String authEmail) {
        User user = getAuthenticatedUserAndVerifyOwnership(userId, authEmail);

        DietaryPreference preference = user.getDietaryPreference();
        if (preference == null) {
            preference = new DietaryPreference();
            user.setDietaryPreference(preference);
        }

        preference.setVegan(preferenceDto.getVegan());
        preference.setVegetarian(preferenceDto.getVegetarian());
        preference.setKeto(preferenceDto.getKeto());
        preference.setGlutenFree(preferenceDto.getGlutenFree());
        preference.setDairyFree(preferenceDto.getDairyFree());

        userRepository.save(user);

        return DietaryPreferenceDto.builder()
                .vegan(preference.getVegan())
                .vegetarian(preference.getVegetarian())
                .keto(preference.getKeto())
                .glutenFree(preference.getGlutenFree())
                .dairyFree(preference.getDairyFree())
                .build();
    }

    public NutritionGoalDto updateNutritionGoal(Long userId, NutritionGoalDto goalDto, String authEmail) {
        User user = getAuthenticatedUserAndVerifyOwnership(userId, authEmail);

        NutritionGoal goal = user.getNutritionGoal();
        if (goal == null) {
            goal = new NutritionGoal();
            user.setNutritionGoal(goal);
        }

        goal.setFitnessGoal(goalDto.getFitnessGoal());
        goal.setCalorieTarget(goalDto.getCalorieTarget());
        goal.setProteinTarget(goalDto.getProteinTarget());
        goal.setCarbTarget(goalDto.getCarbTarget());
        goal.setFatTarget(goalDto.getFatTarget());

        userRepository.save(user);

        return NutritionGoalDto.builder()
                .fitnessGoal(goal.getFitnessGoal())
                .calorieTarget(goal.getCalorieTarget())
                .proteinTarget(goal.getProteinTarget())
                .carbTarget(goal.getCarbTarget())
                .fatTarget(goal.getFatTarget())
                .build();
    }
}
