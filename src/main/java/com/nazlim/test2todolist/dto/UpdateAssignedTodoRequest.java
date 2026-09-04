package com.nazlim.test2todolist.dto;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdateAssignedTodoRequest(
        @NotBlank @Size(max = 100) String title,
        @Size(max = 500) String description,
        @FutureOrPresent(message = "Geçmiş bir tarih seçilemez") LocalDate dueDate,
        String priority
) {
}
