package com.nazlim.test2todolist.repository;

import com.nazlim.test2todolist.entity.ApprovalStatus;
import com.nazlim.test2todolist.entity.Todo;
import org.springframework.data.jpa.repository.JpaRepository;
import com.nazlim.test2todolist.entity.AppUser;
import java.time.LocalDate;
import java.util.Optional;

import java.util.List;

public interface TodoRepository extends JpaRepository<Todo, Long> {
    List<Todo> findByCompleted(boolean completed);

    List<Todo> findByUser(AppUser user);

    List<Todo> findByUserAndCompleted(AppUser user, boolean completed);

    Optional<Todo> findByIdAndUser(Long id, AppUser user);

    List<Todo> findByAssignedBy(AppUser assignedBy);

    Optional<Todo> findByIdAndAssignedBy(Long id, AppUser assignedBy);

    List<Todo> findByAssignedByAndApprovalStatus(AppUser assignedBy, ApprovalStatus approvalStatus);

    List<Todo> findByCompletedFalseAndReminderSentFalseAndDueDateBetween(LocalDate start, LocalDate end);
}
