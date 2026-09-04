package com.nazlim.test2todolist.dto;

import java.util.List;

public record TeamWorkloadResponse(
        Long teamId,
        String teamName,
        List<MemberWorkloadResponse> members
) {
}
