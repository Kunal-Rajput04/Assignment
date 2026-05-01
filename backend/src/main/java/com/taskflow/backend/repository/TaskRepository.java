package com.taskflow.backend.repository;

import com.taskflow.backend.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByProjectId(Long projectId);
    void deleteByProjectId(Long projectId);
}
