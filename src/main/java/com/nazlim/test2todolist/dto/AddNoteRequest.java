package com.nazlim.test2todolist.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AddNoteRequest(
        @NotBlank @Size(max = 1000) String content
) {
}
