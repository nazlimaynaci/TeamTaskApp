package com.nazlim.test2todolist.dto;

import java.time.Instant;

public record TodoLogEntryResponse(
        Long id,
        String authorFullName,
        String authorUsername,
        String content,
        String type,
        Instant createdAt
) {
}
