package com.nazlim.test2todolist.services;

import com.nazlim.test2todolist.dto.AssignTodoRequest;
import com.nazlim.test2todolist.dto.RejectTodoRequest;
import com.nazlim.test2todolist.dto.TodoRequest;
import com.nazlim.test2todolist.dto.TodoResponse;

import java.util.List;

public interface TodoService {
    TodoResponse create(TodoRequest request);
    List<TodoResponse> getAll();
    TodoResponse getById(Long id);
    TodoResponse update(Long id, TodoRequest request);
    void delete(Long id);
    List<TodoResponse> getByStatus(boolean completed);
    TodoResponse assignTodo(AssignTodoRequest request);
    List<TodoResponse> getAssignedByMe();
    List<TodoResponse> getByApprovalStatus(String status);
    TodoResponse approve(Long id);
    TodoResponse reject(Long id, RejectTodoRequest request);
}