package com.nazlim.test2todolist.dto;

public record MemberWorkloadResponse(
        Long id,
        String fullName,
        String username,
        long openTaskCount,
        long pendingApprovalCount
) {
}
