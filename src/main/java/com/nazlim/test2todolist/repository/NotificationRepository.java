package com.nazlim.test2todolist.repository;

import com.nazlim.test2todolist.entity.AppUser;
import com.nazlim.test2todolist.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByRecipientOrderByCreatedAtDesc(AppUser recipient);
    List<Notification> findByRecipientAndReadFalse(AppUser recipient);
}
