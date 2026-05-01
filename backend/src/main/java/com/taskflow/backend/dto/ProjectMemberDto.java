package com.taskflow.backend.dto;

public record ProjectMemberDto(Long userId, String name, String email, String role) {
}
