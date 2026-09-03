package com.nazlim.test2todolist.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record AssignTodoRequest(
        @NotBlank @Size(max = 100) String title,
        @Size(max = 500) String description,
        LocalDate dueDate,
        String priority,
        @NotNull Long assigneeId
) {
}
