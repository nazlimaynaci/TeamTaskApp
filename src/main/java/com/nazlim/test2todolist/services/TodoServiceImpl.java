package com.nazlim.test2todolist.services;

import com.nazlim.test2todolist.auth.UserRepository;
import com.nazlim.test2todolist.dto.AssignTodoRequest;
import com.nazlim.test2todolist.dto.RejectTodoRequest;
import com.nazlim.test2todolist.dto.TodoRequest;
import com.nazlim.test2todolist.dto.TodoResponse;
import com.nazlim.test2todolist.entity.AppUser;
import com.nazlim.test2todolist.entity.ApprovalStatus;
import com.nazlim.test2todolist.entity.Role;
import com.nazlim.test2todolist.entity.Todo;
import com.nazlim.test2todolist.mapper.TodoMapper;
import com.nazlim.test2todolist.repository.TodoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class TodoServiceImpl implements TodoService {

    private final TodoRepository repo;

    private final UserRepository userRepository;

    private final NotificationService notificationService;

    public TodoServiceImpl(TodoRepository repo, UserRepository userRepository, NotificationService notificationService) {
        this.repo = repo;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    @Override
    public TodoResponse create(TodoRequest request) {
        AppUser currentUser = getCurrentUser();

        Todo entity = TodoMapper.toEntity(request);
        entity.setUser(currentUser);

        Todo saved = repo.save(entity);
        return TodoMapper.toResponse(saved);
    }
    @Override
    public List<TodoResponse> getAll() {
        AppUser currentUser = getCurrentUser();

        return repo.findByUser(currentUser)
                .stream()
                .map(TodoMapper::toResponse)
                .toList();
    }

    @Override
    public TodoResponse getById(Long id) {
        AppUser currentUser = getCurrentUser();

        Todo todo = repo.findByIdAndUser(id, currentUser)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Todo not found: " + id));

        return TodoMapper.toResponse(todo);
    }

    @Override
    public TodoResponse update(Long id, TodoRequest request) {
        AppUser currentUser = getCurrentUser();

        Todo existing = repo.findByIdAndUser(id, currentUser)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Todo not found: " + id));

        boolean wasCompleted = existing.isCompleted();
        boolean justBecamePending = false;

        existing.setTitle(request.getTitle());
        existing.setDescription(request.getDescription());
        existing.setCompleted(request.isCompleted());
        existing.setDueDate(request.getDueDate());
        existing.setPriority(request.getPriority());

        if (existing.getAssignedBy() != null) {
            if (!wasCompleted && existing.isCompleted()) {
                existing.setApprovalStatus(ApprovalStatus.PENDING);
                justBecamePending = true;
            } else if (!existing.isCompleted()
                    && (existing.getApprovalStatus() == ApprovalStatus.PENDING
                        || existing.getApprovalStatus() == ApprovalStatus.REJECTED)) {
                existing.setApprovalStatus(ApprovalStatus.NOT_APPLICABLE);
            }
        }

        Todo saved = repo.save(existing);

        if (justBecamePending) {
            notificationService.notifyPendingApproval(saved.getAssignedBy(), saved);
        }

        return TodoMapper.toResponse(saved);
    }

    @Override
    public void delete(Long id) {
        AppUser currentUser = getCurrentUser();

        Todo existing = repo.findByIdAndUser(id, currentUser)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Todo not found: " + id));

        repo.delete(existing);
    }
    @Override
    public List<TodoResponse> getByStatus(boolean completed) {
        AppUser currentUser = getCurrentUser();

        return repo.findByUserAndCompleted(currentUser, completed)
                .stream()
                .map(TodoMapper::toResponse)
                .toList();

    }
    @Override
    public TodoResponse assignTodo(AssignTodoRequest request) {
        AppUser manager = getCurrentUser();

        AppUser assignee = userRepository.findById(request.assigneeId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Çalışan bulunamadı"));

        if (assignee.getRole() != Role.WORKER) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Görev sadece çalışanlara atanabilir");
        }

        Todo entity = new Todo();
        entity.setTitle(request.title());
        entity.setDescription(request.description());
        entity.setDueDate(request.dueDate());
        entity.setPriority(request.priority());
        entity.setCompleted(false);
        entity.setUser(assignee);
        entity.setAssignedBy(manager);

        Todo saved = repo.save(entity);
        notificationService.notifyTaskAssigned(assignee, saved);
        return TodoMapper.toResponse(saved);
    }

    @Override
    public List<TodoResponse> getAssignedByMe() {
        AppUser manager = getCurrentUser();

        return repo.findByAssignedBy(manager)
                .stream()
                .map(TodoMapper::toResponse)
                .toList();
    }

    @Override
    public List<TodoResponse> getByApprovalStatus(String status) {
        AppUser manager = getCurrentUser();

        ApprovalStatus parsed;
        try {
            parsed = ApprovalStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Geçersiz onay durumu: " + status);
        }

        return repo.findByAssignedByAndApprovalStatus(manager, parsed)
                .stream()
                .map(TodoMapper::toResponse)
                .toList();
    }

    @Override
    public TodoResponse approve(Long id) {
        AppUser manager = getCurrentUser();

        Todo todo = repo.findByIdAndAssignedBy(id, manager)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Görev bulunamadı"));

        if (todo.getApprovalStatus() != ApprovalStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bu görev onay beklemiyor");
        }

        todo.setApprovalStatus(ApprovalStatus.APPROVED);
        todo.setRejectionReason(null);

        Todo saved = repo.save(todo);
        notificationService.notifyApproved(saved.getUser(), saved);
        return TodoMapper.toResponse(saved);
    }

    @Override
    public TodoResponse reject(Long id, RejectTodoRequest request) {
        AppUser manager = getCurrentUser();

        Todo todo = repo.findByIdAndAssignedBy(id, manager)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Görev bulunamadı"));

        if (todo.getApprovalStatus() != ApprovalStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bu görev onay beklemiyor");
        }

        todo.setApprovalStatus(ApprovalStatus.REJECTED);
        todo.setCompleted(false);
        todo.setRejectionReason(request.reason());

        Todo saved = repo.save(todo);
        notificationService.notifyRejected(saved.getUser(), saved, request.reason());
        return TodoMapper.toResponse(saved);
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