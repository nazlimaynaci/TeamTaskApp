package com.nazlim.test2todolist.dto;

import java.time.Instant;
import java.time.LocalDate;

public record TodoHistoryResponse(
        Long id,
        String title,
        String priority,
        LocalDate dueDate,
        Instant completedAt,
        Long durationDays,
        String assignedByName,
        Integer performanceRating
) {
}
