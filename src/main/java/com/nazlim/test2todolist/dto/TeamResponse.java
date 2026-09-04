package com.nazlim.test2todolist.dto;

import java.util.List;

public record TeamResponse(Long id, String name, List<UserSummaryResponse> members) {
}
