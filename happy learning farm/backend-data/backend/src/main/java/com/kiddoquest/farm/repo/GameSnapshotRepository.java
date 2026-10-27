package com.kiddoquest.farm.repo;

import org.springframework.data.jpa.repository.JpaRepository;

import com.kiddoquest.farm.domain.GameSnapshot;

public interface GameSnapshotRepository extends JpaRepository<GameSnapshot, String> {
}
