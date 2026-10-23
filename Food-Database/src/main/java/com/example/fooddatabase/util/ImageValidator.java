package com.example.fooddatabase.util;

import com.example.fooddatabase.exception.InvalidImageException;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * Validates food image uploads by checking:
 * 1. File non-emptiness.
 * 2. Maximum size (5 MB limit).
 * 3. Deep content inspection of magic bytes / container signatures (JPG, PNG, WebP).
 *
 * This ensures that uploaded files are genuine images, rather than relying
 * solely on client-supplied Content-Type headers or file extensions.
 */
@Component
public class ImageValidator {

    public static final long MAX_FILE_SIZE_BYTES = 5L * 1024 * 1024; // 5 MB

    public enum SupportedFormat {
        JPEG("image/jpeg", "jpg"),
        PNG("image/png", "png"),
        WEBP("image/webp", "webp");

        private final String mimeType;
        private final String extension;

        SupportedFormat(String mimeType, String extension) {
            this.mimeType = mimeType;
            this.extension = extension;
        }

        public String getMimeType() {
            return mimeType;
        }

        public String getExtension() {
            return extension;
        }
    }

    /**
     * Inspects binary content of the file and returns its detected SupportedFormat.
     * Throws InvalidImageException if file is null, empty, >5MB, or not genuine JPG/PNG/WebP.
     */
    public SupportedFormat validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidImageException("Image file cannot be empty.");
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new InvalidImageException(
                    String.format("Image file size (%.2f MB) exceeds the maximum allowed limit of 5 MB.",
                            file.getSize() / (1024.0 * 1024.0))
            );
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new InvalidImageException("Failed to read image content: " + e.getMessage());
        }

        if (bytes == null || bytes.length < 12) {
            throw new InvalidImageException("Invalid image: file header is too small to be a valid image.");
        }

        if (isJpeg(bytes)) {
            return SupportedFormat.JPEG;
        }
        if (isPng(bytes)) {
            return SupportedFormat.PNG;
        }
        if (isWebp(bytes)) {
            return SupportedFormat.WEBP;
        }

        throw new InvalidImageException(
                "Invalid image format. Only genuine JPEG, PNG, and WebP images are accepted. Content header signature did not match."
        );
    }

    /**
     * JPEG magic bytes: FF D8 FF
     */
    private boolean isJpeg(byte[] b) {
        return (b[0] == (byte) 0xFF && b[1] == (byte) 0xD8 && b[2] == (byte) 0xFF);
    }

    /**
     * PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
     */
    private boolean isPng(byte[] b) {
        return (b[0] == (byte) 0x89 && b[1] == (byte) 0x50 && b[2] == (byte) 0x4E && b[3] == (byte) 0x47 &&
                b[4] == (byte) 0x0D && b[5] == (byte) 0x0A && b[6] == (byte) 0x1A && b[7] == (byte) 0x0A);
    }

    /**
     * WebP container signature:
     * Bytes 0..3: 'RIFF' (0x52, 0x49, 0x46, 0x46)
     * Bytes 8..11: 'WEBP' (0x57, 0x45, 0x42, 0x50)
     */
    private boolean isWebp(byte[] b) {
        boolean hasRiff = (b[0] == 0x52 && b[1] == 0x49 && b[2] == 0x46 && b[3] == 0x46);
        boolean hasWebp = (b[8] == 0x57 && b[9] == 0x45 && b[10] == 0x42 && b[11] == 0x50);
        return hasRiff && hasWebp;
    }
}
