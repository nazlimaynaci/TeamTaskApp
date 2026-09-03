package com.nazlim.test2todolist.mapper;

import com.nazlim.test2todolist.dto.TodoRequest;
import com.nazlim.test2todolist.dto.TodoResponse;
import com.nazlim.test2todolist.entity.Todo;

public class TodoMapper {

    public static Todo toEntity(TodoRequest req) {
        Todo t = new Todo();
        t.setTitle(req.getTitle());
        t.setDescription(req.getDescription());
        t.setCompleted(req.isCompleted());
        t.setDueDate(req.getDueDate());
        t.setPriority(req.getPriority());
        return t;
    }

    public static TodoResponse toResponse(Todo todo) {
        String assignedByUsername = todo.getAssignedBy() != null ? todo.getAssignedBy().getUsername() : null;
        String assigneeUsername = todo.getUser() != null ? todo.getUser().getUsername() : null;

        return new TodoResponse(
                todo.getId(),
                todo.getTitle(),
                todo.getDescription(),
                todo.isCompleted(),
                todo.getDueDate(),
                todo.getPriority(),
                assignedByUsername,
                assigneeUsername,
                todo.getApprovalStatus().name()
        );
    }
}