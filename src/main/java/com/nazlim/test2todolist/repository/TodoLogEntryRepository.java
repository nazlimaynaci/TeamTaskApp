package com.nazlim.test2todolist.repository;

import com.nazlim.test2todolist.entity.Todo;
import com.nazlim.test2todolist.entity.TodoLogEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TodoLogEntryRepository extends JpaRepository<TodoLogEntry, Long> {
    List<TodoLogEntry> findByTodoOrderByCreatedAtAsc(Todo todo);
    void deleteByTodo(Todo todo);
}
