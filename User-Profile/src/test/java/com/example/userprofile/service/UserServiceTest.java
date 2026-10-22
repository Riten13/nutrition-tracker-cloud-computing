package com.example.userprofile.service;

import com.example.userprofile.dto.NutritionGoalDto;
import com.example.userprofile.entity.NutritionGoal;
import com.example.userprofile.entity.User;
import com.example.userprofile.exception.ResourceNotFoundException;
import com.example.userprofile.exception.UnauthorizedAccessException;
import com.example.userprofile.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private SequenceGeneratorService sequenceGeneratorService;

    @InjectMocks
    private UserService userService;

    private Long userId = 1001L;
    private String authEmail = "john@example.com";

    @Test
    @DisplayName("updateNutritionGoal successfully updates targets for authenticated owner")
    void updateNutritionGoal_whenOwner_updatesGoalSuccessfully() {
        User user = User.builder()
                .id(userId)
                .email(authEmail)
                .name("John Doe")
                .build();

        NutritionGoalDto goalDto = NutritionGoalDto.builder()
                .fitnessGoal("LOSE_WEIGHT")
                .calorieTarget(1800.0)
                .proteinTarget(150.0)
                .carbTarget(180.0)
                .fatTarget(55.0)
                .build();

        when(userRepository.findByEmail(authEmail)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        NutritionGoalDto response = userService.updateNutritionGoal(userId, goalDto, authEmail);

        assertThat(response).isNotNull();
        assertThat(response.getFitnessGoal()).isEqualTo("LOSE_WEIGHT");
        assertThat(response.getCalorieTarget()).isEqualTo(1800.0);
        assertThat(response.getProteinTarget()).isEqualTo(150.0);
        assertThat(response.getCarbTarget()).isEqualTo(180.0);
        assertThat(response.getFatTarget()).isEqualTo(55.0);

        verify(userRepository, times(1)).save(user);
    }

    @Test
    @DisplayName("updateNutritionGoal throws UnauthorizedAccessException when updating another user's goal")
    void updateNutritionGoal_whenForeignUser_throwsUnauthorized() {
        User user = User.builder()
                .id(userId)
                .email(authEmail)
                .name("John Doe")
                .build();

        when(userRepository.findByEmail(authEmail)).thenReturn(Optional.of(user));

        Long foreignUserId = 9999L;
        NutritionGoalDto goalDto = NutritionGoalDto.builder()
                .fitnessGoal("GAIN_WEIGHT")
                .calorieTarget(2500.0)
                .build();

        assertThatThrownBy(() -> userService.updateNutritionGoal(foreignUserId, goalDto, authEmail))
                .isInstanceOf(UnauthorizedAccessException.class)
                .hasMessageContaining("You are not authorized to access user ID");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("updateNutritionGoal throws ResourceNotFoundException when authenticated user not found")
    void updateNutritionGoal_whenUserNotFound_throwsNotFound() {
        when(userRepository.findByEmail(authEmail)).thenReturn(Optional.empty());

        NutritionGoalDto goalDto = NutritionGoalDto.builder().calorieTarget(2000.0).build();

        assertThatThrownBy(() -> userService.updateNutritionGoal(userId, goalDto, authEmail))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Authenticated user not found");
    }
}

