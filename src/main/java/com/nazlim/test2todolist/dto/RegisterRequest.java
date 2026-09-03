package com.nazlim.test2todolist.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record RegisterRequest(
        @NotBlank String username,
        @NotBlank String password,
        @NotBlank @Pattern(regexp = "MANAGER|WORKER", message = "Role must be MANAGER or WORKER") String role,
        @NotBlank String fullName,
        @NotBlank @Email String email,
        String phone,
        String company,
        String position,
        String inviteCode,
        boolean acceptedTerms
) {
}
