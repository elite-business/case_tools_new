package com.elite.casetools.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Generic paginated response wrapper
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaginatedResponse<T> {
    
    private List<T> content;
    private long totalElements;
    private int totalPages;
    private int number;
    private int size;
    private boolean first;
    private boolean last;
    private boolean empty;
    
    /**
     * Create from Spring Page
     */
    public static <T> PaginatedResponse<T> fromPage(org.springframework.data.domain.Page<T> page) {
        PaginatedResponse<T> response = new PaginatedResponse<>();
        response.setContent(page.getContent());
        response.setTotalElements(page.getTotalElements());
        response.setTotalPages(page.getTotalPages());
        response.setNumber(page.getNumber());
        response.setSize(page.getSize());
        response.setFirst(page.isFirst());
        response.setLast(page.isLast());
        response.setEmpty(page.isEmpty());
        return response;
    }
}