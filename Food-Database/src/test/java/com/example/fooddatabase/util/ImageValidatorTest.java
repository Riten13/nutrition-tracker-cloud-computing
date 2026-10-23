package com.example.fooddatabase.util;

import com.example.fooddatabase.exception.InvalidImageException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ImageValidatorTest {

    private ImageValidator imageValidator;

    @BeforeEach
    void setUp() {
        imageValidator = new ImageValidator();
    }

    @Test
    @DisplayName("Valid JPEG with magic bytes FF D8 FF is accepted")
    void validate_validJpeg_returnsJpegFormat() {
        byte[] jpegBytes = new byte[]{
                (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0,
                0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01
        };

        MockMultipartFile file = new MockMultipartFile(
                "image", "sample.jpg", "image/jpeg", jpegBytes
        );

        ImageValidator.SupportedFormat format = imageValidator.validate(file);
        assertThat(format).isEqualTo(ImageValidator.SupportedFormat.JPEG);
        assertThat(format.getMimeType()).isEqualTo("image/jpeg");
        assertThat(format.getExtension()).isEqualTo("jpg");
    }

    @Test
    @DisplayName("Valid PNG with magic bytes 89 50 4E 47 0D 0A 1A 0A is accepted")
    void validate_validPng_returnsPngFormat() {
        byte[] pngBytes = new byte[]{
                (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
                0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52
        };

        MockMultipartFile file = new MockMultipartFile(
                "image", "photo.png", "image/png", pngBytes
        );

        ImageValidator.SupportedFormat format = imageValidator.validate(file);
        assertThat(format).isEqualTo(ImageValidator.SupportedFormat.PNG);
        assertThat(format.getMimeType()).isEqualTo("image/png");
        assertThat(format.getExtension()).isEqualTo("png");
    }

    @Test
    @DisplayName("Valid WebP with RIFF and WEBP container headers is accepted")
    void validate_validWebp_returnsWebpFormat() {
        byte[] webpBytes = new byte[]{
                0x52, 0x49, 0x46, 0x46, // RIFF
                0x24, 0x00, 0x00, 0x00, // length
                0x57, 0x45, 0x42, 0x50, // WEBP
                0x56, 0x50, 0x38, 0x20  // VP8
        };

        MockMultipartFile file = new MockMultipartFile(
                "image", "food.webp", "image/webp", webpBytes
        );

        ImageValidator.SupportedFormat format = imageValidator.validate(file);
        assertThat(format).isEqualTo(ImageValidator.SupportedFormat.WEBP);
        assertThat(format.getMimeType()).isEqualTo("image/webp");
        assertThat(format.getExtension()).isEqualTo("webp");
    }

    @Test
    @DisplayName("File with spoofed extension and wrong magic bytes is rejected")
    void validate_spoofedExtension_throwsInvalidImageException() {
        // Plain text file renamed to fake.jpg
        byte[] textBytes = "This is a plain text file, not an image!".getBytes();
        MockMultipartFile file = new MockMultipartFile(
                "image", "fake.jpg", "image/jpeg", textBytes
        );

        assertThatThrownBy(() -> imageValidator.validate(file))
                .isInstanceOf(InvalidImageException.class)
                .hasMessageContaining("Content header signature did not match");
    }

    @Test
    @DisplayName("Empty file is rejected")
    void validate_emptyFile_throwsInvalidImageException() {
        MockMultipartFile file = new MockMultipartFile(
                "image", "empty.jpg", "image/jpeg", new byte[0]
        );

        assertThatThrownBy(() -> imageValidator.validate(file))
                .isInstanceOf(InvalidImageException.class)
                .hasMessageContaining("Image file cannot be empty");
    }

    @Test
    @DisplayName("File exceeding 5 MB is rejected")
    void validate_exceedingSize_throwsInvalidImageException() {
        byte[] oversizedBytes = new byte[5 * 1024 * 1024 + 1];
        MockMultipartFile file = new MockMultipartFile(
                "image", "large.jpg", "image/jpeg", oversizedBytes
        );

        assertThatThrownBy(() -> imageValidator.validate(file))
                .isInstanceOf(InvalidImageException.class)
                .hasMessageContaining("exceeds the maximum allowed limit of 5 MB");
    }
}
