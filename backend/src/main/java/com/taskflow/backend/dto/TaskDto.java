package com.taskflow.backend.dto;

public record TaskDto(
    Long id,
    String title,
    String description,
    String status,
    String dueDate,
    ProjectSummary project,
    UserDto assignedTo,
    UserDto createdBy,
    String createdAt
) {
}
