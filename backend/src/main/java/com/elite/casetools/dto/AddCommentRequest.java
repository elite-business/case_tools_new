package com.elite.casetools.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

/**
 * DTO for adding a comment to a case
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddCommentRequest {
    
    @NotBlank(message = "Comment content is required")
    private String content;
    
    private Boolean isInternal;
    
    // Additional fields for backward compatibility
    private String comment;
    private String commentType;
    private List<String> attachments;
    
    // Helper method to get comment content
    public String getComment() {
        return comment != null ? comment : content;
    }
}