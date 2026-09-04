package com.nazlim.test2todolist.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record HandoffRequest(
        @NotNull Long newAssigneeId,
        @Size(max = 500) String message
) {
}
