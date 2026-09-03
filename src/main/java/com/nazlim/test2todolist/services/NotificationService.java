package com.nazlim.test2todolist.services;

import com.nazlim.test2todolist.dto.NotificationResponse;
import com.nazlim.test2todolist.entity.AppUser;
import com.nazlim.test2todolist.entity.Todo;

import java.util.List;

public interface NotificationService {
    void notifyTaskAssigned(AppUser worker, Todo todo);
    void notifyPendingApproval(AppUser manager, Todo todo);
    void notifyApproved(AppUser worker, Todo todo);
    void notifyRejected(AppUser worker, Todo todo, String reason);
    List<NotificationResponse> getMyNotifications();
    void markRead(Long id);
    void markAllRead();
}
