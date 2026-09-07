package com.nazlim.test2todolist.dto;

public record MyProfileResponse(
        String fullName,
        String username,
        String role,
        String company,
        String position,
        Integer performanceRating
) {
}
