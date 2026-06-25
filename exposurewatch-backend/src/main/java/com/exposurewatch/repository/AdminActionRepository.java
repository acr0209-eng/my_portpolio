package com.exposurewatch.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.exposurewatch.domain.AdminAction;

public interface AdminActionRepository extends JpaRepository<AdminAction, Long> {
}
