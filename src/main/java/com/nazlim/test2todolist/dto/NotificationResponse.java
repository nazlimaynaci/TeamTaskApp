package com.nazlim.test2todolist.dto;

import java.time.Instant;

public record NotificationResponse(Long id, String message, boolean read, Instant createdAt, Long relatedTodoId) {
}
