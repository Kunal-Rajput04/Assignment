package com.taskflow.backend.controller;

import com.taskflow.backend.dto.TaskDto;
import com.taskflow.backend.dto.TaskRequest;
import com.taskflow.backend.dto.UserDto;
import com.taskflow.backend.dto.ProjectSummary;
import com.taskflow.backend.model.Project;
import com.taskflow.backend.model.Task;
import com.taskflow.backend.model.User;
import com.taskflow.backend.repository.ProjectRepository;
import com.taskflow.backend.repository.TaskRepository;
import com.taskflow.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;

    public TaskController(TaskRepository taskRepository,
                          UserRepository userRepository,
                          ProjectRepository projectRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
    }

    @GetMapping
    public List<TaskDto> getTasks() {
        return taskRepository.findAll().stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    @PostMapping
    public TaskDto createTask(@RequestBody TaskRequest request, Authentication authentication) {
        User creator = currentUser(authentication);
        Task task = new Task();
        task.setTitle(request.title());
        task.setDescription(request.description());
        task.setStatus(request.status() == null ? "pending" : request.status());
        task.setDueDate(parseDueDate(request.dueDate()));
        task.setCreatedBy(creator);
        if (request.projectId() != null) {
            Project project = projectRepository.findById(request.projectId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
            task.setProject(project);
        }
        if (request.assignedToId() != null) {
            User assigned = userRepository.findById(request.assignedToId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
            task.setAssignedTo(assigned);
        }
        return toDto(taskRepository.save(task));
    }

    @PutMapping("/{id}")
    public TaskDto updateTask(@PathVariable Long id, @RequestBody TaskRequest request) {
        Task task = taskRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));

        if (request.title() != null) task.setTitle(request.title());
        if (request.description() != null) task.setDescription(request.description());
        if (request.status() != null) task.setStatus(request.status());
        task.setDueDate(parseDueDate(request.dueDate()));

        if (request.projectId() != null) {
            Project project = projectRepository.findById(request.projectId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
            task.setProject(project);
        }

        if (request.assignedToId() != null) {
            User assigned = userRepository.findById(request.assignedToId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
            task.setAssignedTo(assigned);
        }

        return toDto(taskRepository.save(task));
    }

    @DeleteMapping("/{id}")
    public void deleteTask(@PathVariable Long id) {
        if (!taskRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found");
        }
        taskRepository.deleteById(id);
    }

    private TaskDto toDto(Task task) {
        UserDto assigned = task.getAssignedTo() != null
            ? new UserDto(task.getAssignedTo().getId(), task.getAssignedTo().getName(), task.getAssignedTo().getEmail(), task.getAssignedTo().getRole())
            : null;
        UserDto createdBy = new UserDto(task.getCreatedBy().getId(), task.getCreatedBy().getName(), task.getCreatedBy().getEmail(), task.getCreatedBy().getRole());
        ProjectSummary project = task.getProject() != null
            ? new ProjectSummary(task.getProject().getId(), task.getProject().getName())
            : null;

        return new TaskDto(
            task.getId(),
            task.getTitle(),
            task.getDescription(),
            task.getStatus(),
            task.getDueDate() != null ? task.getDueDate().toString() : null,
            project,
            assigned,
            createdBy,
            task.getCreatedAt().toString()
        );
    }

    private LocalDate parseDueDate(String dueDate) {
        if (dueDate == null || dueDate.isBlank()) {
            return null;
        }
        return LocalDate.parse(dueDate);
    }

    private User currentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        return userRepository.findByEmail(authentication.getName())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }
}
