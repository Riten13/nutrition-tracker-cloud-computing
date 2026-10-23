package com.example.fooddatabase.service;

import com.example.fooddatabase.exception.S3StorageException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.time.Duration;

/**
 * Service encapsulating AWS S3 interactions:
 * - Direct binary uploads
 * - Object deletions
 * - Temporary presigned GET URL generation for private bucket display
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class S3StorageService {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    @Value("${aws.s3.bucket:nutrition-tracker-food-images-2026-new}")
    private String bucketName;

    @Value("${aws.s3.presigned-url-expiration-minutes:60}")
    private int presignedUrlExpirationMinutes;

    /**
     * Uploads an image binary directly to the private S3 bucket.
     *
     * @param key S3 object key (e.g., "food-images/...")
     * @param imageBytes byte array of image
     * @param contentType MIME type (e.g., "image/jpeg", "image/png", "image/webp")
     */
    public void uploadImage(String key, byte[] imageBytes, String contentType) {
        log.info("Uploading image to S3 bucket '{}' with key '{}' ({} bytes, content-type: {})",
                bucketName, key, imageBytes.length, contentType);

        try {
            PutObjectRequest putRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(contentType)
                    .build();

            s3Client.putObject(putRequest, RequestBody.fromBytes(imageBytes));
            log.info("Successfully uploaded object to S3: {}", key);
        } catch (Exception e) {
            log.error("Failed to upload object to S3: {}", e.getMessage(), e);
            throw new S3StorageException("Failed to upload image to AWS S3: " + e.getMessage(), e);
        }
    }

    /**
     * Deletes an object from the S3 bucket.
     *
     * @param key S3 object key
     */
    public void deleteImage(String key) {
        if (key == null || key.isBlank()) {
            return;
        }

        log.info("Deleting image from S3 bucket '{}' with key '{}'", bucketName, key);
        try {
            DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build();

            s3Client.deleteObject(deleteRequest);
            log.info("Successfully deleted object from S3: {}", key);
        } catch (Exception e) {
            log.warn("Error deleting object '{}' from S3: {}", key, e.getMessage());
            throw new S3StorageException("Failed to delete image from S3: " + e.getMessage(), e);
        }
    }

    /**
     * Generates a temporary presigned GET URL allowing client browsers to fetch
     * the private S3 image without making the bucket public.
     *
     * Falls back to null gracefully if presigning fails or credentials are unavailable,
     * ensuring that public food GET endpoints continue functioning normally.
     *
     * @param key S3 object key
     * @return Presigned GET URL or null if key is empty or presigning unavailable
     */
    public String generatePresignedUrl(String key) {
        if (key == null || key.isBlank()) {
            return null;
        }

        try {
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build();

            GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofMinutes(presignedUrlExpirationMinutes))
                    .getObjectRequest(getObjectRequest)
                    .build();

            PresignedGetObjectRequest presignedRequest = s3Presigner.presignGetObject(presignRequest);
            return presignedRequest.url().toString();
        } catch (Exception e) {
            log.warn("Could not generate presigned URL for S3 key '{}': {}", key, e.getMessage());
            return null;
        }
    }

    public String getBucketName() {
        return bucketName;
    }
}
