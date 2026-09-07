package com.nazlim.test2todolist.dto;

import java.util.List;

public record WorkerDetailResponse(
        Long id,
        String fullName,
        String username,
        String email,
        String phone,
        String position,
        long completedTaskCount,
        Double avgCompletionDays,
        Integer performanceRating,
        List<TodoResponse> activeTasks,
        List<TodoHistoryResponse> completedTasks
) {
}
