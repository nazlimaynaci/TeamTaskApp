package com.nazlim.test2todolist.dto;

import java.time.Instant;

public record InviteCodeResponse(
        Long id,
        String code,
        boolean used,
        String usedByFullName,
        Instant createdAt
) {
}
