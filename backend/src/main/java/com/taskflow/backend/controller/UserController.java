package com.taskflow.backend.controller;

import com.taskflow.backend.dto.UserDto;
import com.taskflow.backend.repository.UserRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<UserDto> getUsers() {
        return userRepository.findAll().stream()
            .map(user -> new UserDto(user.getId(), user.getName(), user.getEmail(), user.getRole()))
            .collect(Collectors.toList());
    }
}
