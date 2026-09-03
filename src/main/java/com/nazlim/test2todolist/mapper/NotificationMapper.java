package com.nazlim.test2todolist.mapper;

import com.nazlim.test2todolist.dto.NotificationResponse;
import com.nazlim.test2todolist.entity.Notification;

public class NotificationMapper {

    public static NotificationResponse toResponse(Notification n) {
        return new NotificationResponse(
                n.getId(),
                n.getMessage(),
                n.isRead(),
                n.getCreatedAt(),
                n.getRelatedTodoId()
        );
    }
}
