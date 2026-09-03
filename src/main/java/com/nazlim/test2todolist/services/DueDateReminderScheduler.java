package com.nazlim.test2todolist.services;

import com.nazlim.test2todolist.entity.Todo;
import com.nazlim.test2todolist.repository.TodoRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
public class DueDateReminderScheduler {

    private static final long REMINDER_WINDOW_DAYS = 5;

    private final TodoRepository todoRepository;
    private final NotificationService notificationService;

    public DueDateReminderScheduler(TodoRepository todoRepository, NotificationService notificationService) {
        this.todoRepository = todoRepository;
        this.notificationService = notificationService;
    }

    @Scheduled(fixedRateString = "${reminder.check-rate-ms}")
    public void checkDueSoonTasks() {
        LocalDate today = LocalDate.now();
        LocalDate windowEnd = today.plusDays(REMINDER_WINDOW_DAYS - 1);

        List<Todo> dueSoon = todoRepository.findByCompletedFalseAndReminderSentFalseAndDueDateBetween(today, windowEnd);

        for (Todo todo : dueSoon) {
            long daysRemaining = ChronoUnit.DAYS.between(today, todo.getDueDate());
            notificationService.notifyDueSoon(todo.getUser(), todo, daysRemaining);
            todo.setReminderSent(true);
            todoRepository.save(todo);
        }
    }
}
