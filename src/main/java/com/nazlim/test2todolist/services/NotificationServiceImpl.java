package com.nazlim.test2todolist.services;

import com.nazlim.test2todolist.auth.UserRepository;
import com.nazlim.test2todolist.dto.NotificationResponse;
import com.nazlim.test2todolist.entity.AppUser;
import com.nazlim.test2todolist.entity.Notification;
import com.nazlim.test2todolist.entity.Todo;
import com.nazlim.test2todolist.mapper.NotificationMapper;
import com.nazlim.test2todolist.repository.NotificationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository repo;
    private final UserRepository userRepository;

    public NotificationServiceImpl(NotificationRepository repo, UserRepository userRepository) {
        this.repo = repo;
        this.userRepository = userRepository;
    }

    @Override
    public void notifyTaskAssigned(AppUser worker, Todo todo) {
        String message = todo.getAssignedBy().getUsername() + " tarafından yeni bir görev atandı: " + todo.getTitle();
        create(worker, message, todo.getId());
    }

    @Override
    public void notifyPendingApproval(AppUser manager, Todo todo) {
        String message = todo.getUser().getUsername() + " \"" + todo.getTitle() + "\" görevini tamamladı, onayını bekliyor";
        create(manager, message, todo.getId());
    }

    @Override
    public void notifyApproved(AppUser worker, Todo todo) {
        String message = "\"" + todo.getTitle() + "\" görevin onaylandı";
        create(worker, message, todo.getId());
    }

    @Override
    public void notifyRejected(AppUser worker, Todo todo, String reason) {
        String message = "\"" + todo.getTitle() + "\" görevin reddedildi";
        if (reason != null && !reason.isBlank()) {
            message += ": " + reason;
        }
        create(worker, message, todo.getId());
    }

    private void create(AppUser recipient, String message, Long relatedTodoId) {
        Notification n = new Notification();
        n.setRecipient(recipient);
        n.setMessage(message);
        n.setRelatedTodoId(relatedTodoId);
        repo.save(n);
    }

    @Override
    public List<NotificationResponse> getMyNotifications() {
        AppUser currentUser = getCurrentUser();

        return repo.findByRecipientOrderByCreatedAtDesc(currentUser)
                .stream()
                .map(NotificationMapper::toResponse)
                .toList();
    }

    @Override
    public void markRead(Long id) {
        AppUser currentUser = getCurrentUser();

        Notification n = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bildirim bulunamadı"));

        if (!n.getRecipient().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu bildirim sana ait değil");
        }

        n.setRead(true);
        repo.save(n);
    }

    @Override
    public void markAllRead() {
        AppUser currentUser = getCurrentUser();

        List<Notification> unread = repo.findByRecipientAndReadFalse(currentUser);
        unread.forEach(n -> n.setRead(true));
        repo.saveAll(unread);
    }

    private AppUser getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || authentication.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }

        String username = authentication.getName();

        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }
}
