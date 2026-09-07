package com.nazlim.test2todolist.services;

import com.nazlim.test2todolist.auth.UserRepository;
import com.nazlim.test2todolist.dto.AddNoteRequest;
import com.nazlim.test2todolist.dto.AssignTodoRequest;
import com.nazlim.test2todolist.dto.HandoffRequest;
import com.nazlim.test2todolist.dto.RejectTodoRequest;
import com.nazlim.test2todolist.dto.TodoHistoryResponse;
import com.nazlim.test2todolist.dto.TodoLogEntryResponse;
import com.nazlim.test2todolist.dto.TodoRequest;
import com.nazlim.test2todolist.dto.TodoResponse;
import com.nazlim.test2todolist.dto.UpdateAssignedTodoRequest;
import com.nazlim.test2todolist.entity.AppUser;
import com.nazlim.test2todolist.entity.ApprovalStatus;
import com.nazlim.test2todolist.entity.LogEntryType;
import com.nazlim.test2todolist.entity.Role;
import com.nazlim.test2todolist.entity.Todo;
import com.nazlim.test2todolist.entity.TodoLogEntry;
import com.nazlim.test2todolist.mapper.TodoMapper;
import com.nazlim.test2todolist.repository.TodoLogEntryRepository;
import com.nazlim.test2todolist.repository.TodoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.stream.Stream;

@Service
public class TodoServiceImpl implements TodoService {

    private final TodoRepository repo;

    private final UserRepository userRepository;

    private final NotificationService notificationService;

    private final TodoLogEntryRepository logRepo;

    public TodoServiceImpl(TodoRepository repo, UserRepository userRepository, NotificationService notificationService, TodoLogEntryRepository logRepo) {
        this.repo = repo;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.logRepo = logRepo;
    }

    @Override
    public TodoResponse create(TodoRequest request) {
        AppUser currentUser = getCurrentUser();

        if (request.getDueDate() != null && request.getDueDate().isBefore(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Geçmiş bir tarihe görev eklenemez");
        }

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
        LocalDate oldDueDate = existing.getDueDate();

        existing.setTitle(request.getTitle());
        existing.setDescription(request.getDescription());
        existing.setCompleted(request.isCompleted());
        existing.setDueDate(request.getDueDate());
        existing.setPriority(request.getPriority());

        if (!Objects.equals(oldDueDate, existing.getDueDate())) {
            existing.setReminderSent(false);
        }

        if (existing.getAssignedBy() != null) {
            if (!wasCompleted && existing.isCompleted()) {
                existing.setApprovalStatus(ApprovalStatus.PENDING);
                justBecamePending = true;
            } else if (!existing.isCompleted()
                    && (existing.getApprovalStatus() == ApprovalStatus.PENDING
                        || existing.getApprovalStatus() == ApprovalStatus.REJECTED)) {
                existing.setApprovalStatus(ApprovalStatus.NOT_APPLICABLE);
            }
        } else {
            if (!wasCompleted && existing.isCompleted()) {
                existing.setCompletedAt(Instant.now());
            } else if (wasCompleted && !existing.isCompleted()) {
                existing.setCompletedAt(null);
            }
        }

        Todo saved = repo.save(existing);

        if (justBecamePending) {
            notificationService.notifyPendingApproval(saved.getAssignedBy(), saved);
        }

        return TodoMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        AppUser currentUser = getCurrentUser();

        Todo existing = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Todo not found: " + id));

        boolean isOwner = existing.getUser() != null && existing.getUser().getId().equals(currentUser.getId());
        boolean isAssigner = existing.getAssignedBy() != null && existing.getAssignedBy().getId().equals(currentUser.getId());

        if (!isOwner && !isAssigner) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Todo not found: " + id);
        }

        logRepo.deleteByTodo(existing);
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

        if (assignee.getTeam() == null || !assignee.getTeam().getManager().getId().equals(manager.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu çalışan senin ekibinde değil");
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
        todo.setCompletedAt(Instant.now());

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

    @Override
    public List<TodoHistoryResponse> getMyHistory() {
        AppUser currentUser = getCurrentUser();

        List<Todo> personal = repo.findByUserAndAssignedByIsNullAndCompletedTrueOrderByCompletedAtDesc(currentUser);
        List<Todo> assigned = repo.findByUserAndApprovalStatusOrderByCompletedAtDesc(currentUser, ApprovalStatus.APPROVED);

        return Stream.concat(personal.stream(), assigned.stream())
                .sorted(Comparator.comparing(Todo::getCompletedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(TodoMapper::toHistoryResponse)
                .toList();
    }

    @Override
    public List<TodoLogEntryResponse> getLog(Long todoId) {
        AppUser currentUser = getCurrentUser();
        Todo todo = getAccessibleTodo(todoId, currentUser);

        return logRepo.findByTodoOrderByCreatedAtAsc(todo)
                .stream()
                .map(TodoMapper::toLogResponse)
                .toList();
    }

    @Override
    public TodoLogEntryResponse addNote(Long todoId, AddNoteRequest request) {
        AppUser currentUser = getCurrentUser();

        Todo todo = repo.findByIdAndUser(todoId, currentUser)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Todo not found: " + todoId));

        TodoLogEntry entry = new TodoLogEntry();
        entry.setTodo(todo);
        entry.setAuthor(currentUser);
        entry.setContent(request.content());
        entry.setType(LogEntryType.NOTE);

        return TodoMapper.toLogResponse(logRepo.save(entry));
    }

    @Override
    public TodoResponse handoff(Long todoId, HandoffRequest request) {
        AppUser currentUser = getCurrentUser();

        Todo todo = repo.findByIdAndUser(todoId, currentUser)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Todo not found: " + todoId));

        if (currentUser.getTeam() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bir ekibin yoksa görev devredemezsin");
        }

        AppUser newAssignee = userRepository.findById(request.newAssigneeId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Çalışan bulunamadı"));

        if (newAssignee.getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Görevi kendine devredemezsin");
        }

        if (newAssignee.getRole() != Role.WORKER
                || newAssignee.getTeam() == null
                || !newAssignee.getTeam().getId().equals(currentUser.getTeam().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sadece kendi ekip arkadaşına devredebilirsin");
        }

        String content = currentUser.getFullName() + " bu görevi " + newAssignee.getFullName() + " kişisine devretti";
        if (request.message() != null && !request.message().isBlank()) {
            content += ": " + request.message();
        }

        TodoLogEntry entry = new TodoLogEntry();
        entry.setTodo(todo);
        entry.setAuthor(currentUser);
        entry.setContent(content);
        entry.setType(LogEntryType.HANDOFF);
        logRepo.save(entry);

        todo.setUser(newAssignee);
        if (todo.isCompleted()) {
            todo.setCompleted(false);
            todo.setApprovalStatus(ApprovalStatus.NOT_APPLICABLE);
            todo.setRejectionReason(null);
        }

        Todo saved = repo.save(todo);
        notificationService.notifyHandoff(newAssignee, saved, currentUser);

        return TodoMapper.toResponse(saved);
    }

    @Override
    public TodoResponse updateAssignedDetails(Long todoId, UpdateAssignedTodoRequest request) {
        AppUser manager = getCurrentUser();

        Todo existing = repo.findByIdAndAssignedBy(todoId, manager)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Görev bulunamadı"));

        LocalDate oldDueDate = existing.getDueDate();

        existing.setTitle(request.title());
        existing.setDescription(request.description());
        existing.setDueDate(request.dueDate());
        existing.setPriority(request.priority());

        if (!Objects.equals(oldDueDate, existing.getDueDate())) {
            existing.setReminderSent(false);
        }

        Todo saved = repo.save(existing);
        return TodoMapper.toResponse(saved);
    }

    private Todo getAccessibleTodo(Long id, AppUser currentUser) {
        Todo todo = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Todo not found: " + id));

        boolean isOwner = todo.getUser() != null && todo.getUser().getId().equals(currentUser.getId());
        boolean isAssigner = todo.getAssignedBy() != null && todo.getAssignedBy().getId().equals(currentUser.getId());

        if (!isOwner && !isAssigner) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Todo not found: " + id);
        }

        return todo;
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