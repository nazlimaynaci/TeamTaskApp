package com.nazlim.test2todolist.controllers;

import com.nazlim.test2todolist.dto.AssignTodoRequest;
import com.nazlim.test2todolist.dto.RejectTodoRequest;
import com.nazlim.test2todolist.dto.TodoRequest;
import com.nazlim.test2todolist.dto.TodoResponse;
import com.nazlim.test2todolist.services.TodoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
@RestController
@RequestMapping("/api/todos")
public class TodoController {

    private final TodoService service;

    public TodoController(TodoService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TodoResponse create(@Valid @RequestBody TodoRequest req) {
        return service.create(req);
    }

    @GetMapping
    public List<TodoResponse> getAll() {
        return service.getAll();
    }

    @GetMapping("/get/{id}")
    public TodoResponse getById(@PathVariable Long id) {
        return service.getById(id);
    }

    @PutMapping("/update/{id}")
    public TodoResponse update(@PathVariable Long id, @Valid @RequestBody TodoRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/delete/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    @GetMapping("/status/{completed}")
    public List<TodoResponse> byStatus(@PathVariable boolean completed) {
        return service.getByStatus(completed);
    }

    @PostMapping("/assign")
    @PreAuthorize("hasRole('MANAGER')")
    @ResponseStatus(HttpStatus.CREATED)
    public TodoResponse assign(@Valid @RequestBody AssignTodoRequest req) {
        return service.assignTodo(req);
    }

    @GetMapping("/assigned-by-me")
    @PreAuthorize("hasRole('MANAGER')")
    public List<TodoResponse> assignedByMe() {
        return service.getAssignedByMe();
    }

    @GetMapping("/approval-status/{status}")
    @PreAuthorize("hasRole('MANAGER')")
    public List<TodoResponse> byApprovalStatus(@PathVariable String status) {
        return service.getByApprovalStatus(status);
    }

    @PutMapping("/approve/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public TodoResponse approve(@PathVariable Long id) {
        return service.approve(id);
    }

    @PutMapping("/reject/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public TodoResponse reject(@PathVariable Long id, @RequestBody(required = false) RejectTodoRequest req) {
        return service.reject(id, req != null ? req : new RejectTodoRequest(null));
    }
}