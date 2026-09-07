package com.nazlim.test2todolist.services;

import com.nazlim.test2todolist.dto.AddNoteRequest;
import com.nazlim.test2todolist.dto.AssignTodoRequest;
import com.nazlim.test2todolist.dto.HandoffRequest;
import com.nazlim.test2todolist.dto.RejectTodoRequest;
import com.nazlim.test2todolist.dto.TodoHistoryResponse;
import com.nazlim.test2todolist.dto.TodoLogEntryResponse;
import com.nazlim.test2todolist.dto.TodoRequest;
import com.nazlim.test2todolist.dto.TodoResponse;
import com.nazlim.test2todolist.dto.UpdateAssignedTodoRequest;

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
    TodoResponse rateTodo(Long id, int rating);

    List<TodoHistoryResponse> getMyHistory();

    List<TodoLogEntryResponse> getLog(Long todoId);
    TodoLogEntryResponse addNote(Long todoId, AddNoteRequest request);
    TodoResponse handoff(Long todoId, HandoffRequest request);
    TodoResponse updateAssignedDetails(Long todoId, UpdateAssignedTodoRequest request);
}