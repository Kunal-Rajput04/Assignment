package com.taskflow.backend.dto;

import java.util.List;

public record ProjectDto(
    Long id,
    String name,
    String description,
    UserDto createdBy,
    String createdAt,
    List<ProjectMemberDto> members
) {
}
