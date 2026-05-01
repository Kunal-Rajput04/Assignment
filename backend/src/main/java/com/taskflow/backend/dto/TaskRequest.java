package com.taskflow.backend.dto;

public record TaskRequest(
    String title,
    String description,
    String status,
    String dueDate,
    Long projectId,
    Long assignedToId
) {
}
