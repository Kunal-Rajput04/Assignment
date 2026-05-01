package com.taskflow.backend.controller;

import com.taskflow.backend.dto.ProjectDto;
import com.taskflow.backend.dto.ProjectMemberDto;
import com.taskflow.backend.dto.ProjectRequest;
import com.taskflow.backend.dto.UserDto;
import com.taskflow.backend.model.Project;
import com.taskflow.backend.model.ProjectMember;
import com.taskflow.backend.model.User;
import com.taskflow.backend.repository.ProjectMemberRepository;
import com.taskflow.backend.repository.ProjectRepository;
import com.taskflow.backend.repository.TaskRepository;
import com.taskflow.backend.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final TaskRepository taskRepository;

    public ProjectController(ProjectRepository projectRepository,
                             UserRepository userRepository,
                             ProjectMemberRepository projectMemberRepository,
                             TaskRepository taskRepository) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.taskRepository = taskRepository;
    }

    @GetMapping
    public List<ProjectDto> getProjects() {
        return projectRepository.findAll().stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    @PostMapping
    public ProjectDto createProject(@RequestBody ProjectRequest request, Authentication authentication) {
        User creator = currentUser(authentication);
        Project project = new Project();
        project.setName(request.name());
        project.setDescription(request.description());
        project.setCreatedBy(creator);
        project = projectRepository.save(project);

        ProjectMember membership = new ProjectMember();
        membership.setProject(project);
        membership.setUser(creator);
        membership.setRole("admin");
        projectMemberRepository.save(membership);

        return toDto(project);
    }

    @PutMapping("/{id}")
    public ProjectDto updateProject(@PathVariable Long id, @RequestBody ProjectRequest request) {
        Project project = projectRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
        project.setName(request.name());
        project.setDescription(request.description());
        return toDto(projectRepository.save(project));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public void deleteProject(@PathVariable Long id) {
        if (!projectRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found");
        }
        taskRepository.deleteByProjectId(id);
        projectMemberRepository.deleteByProjectId(id);
        projectRepository.deleteById(id);
    }

    @PostMapping("/{id}/members")
    public void addMember(@PathVariable Long id, @RequestBody AddMemberRequest request) {
        Project project = projectRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
        User user = userRepository.findById(request.userId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (projectMemberRepository.findByProjectIdAndUserId(id, user.getId()).isPresent()) {
            return;
        }

        ProjectMember membership = new ProjectMember();
        membership.setProject(project);
        membership.setUser(user);
        membership.setRole("member");
        projectMemberRepository.save(membership);
    }

    @DeleteMapping("/{id}/members/{userId}")
    public void removeMember(@PathVariable Long id, @PathVariable Long userId) {
        projectMemberRepository.findByProjectIdAndUserId(id, userId)
            .ifPresent(projectMemberRepository::delete);
    }

    private ProjectDto toDto(Project project) {
        List<ProjectMemberDto> members = projectMemberRepository.findByProjectId(project.getId()).stream()
            .map(pm -> new ProjectMemberDto(pm.getUser().getId(), pm.getUser().getName(), pm.getUser().getEmail(), pm.getRole()))
            .collect(Collectors.toList());

        User createdBy = project.getCreatedBy();
        UserDto creator = new UserDto(createdBy.getId(), createdBy.getName(), createdBy.getEmail(), createdBy.getRole());

        return new ProjectDto(
            project.getId(),
            project.getName(),
            project.getDescription(),
            creator,
            project.getCreatedAt().toString(),
            members
        );
    }

    private User currentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }

        return userRepository.findByEmail(authentication.getName())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private record AddMemberRequest(Long userId) {
    }
}
