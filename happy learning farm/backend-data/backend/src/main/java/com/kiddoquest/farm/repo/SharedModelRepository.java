package com.kiddoquest.farm.repo;

import org.springframework.data.jpa.repository.JpaRepository;

import com.kiddoquest.farm.domain.SharedModel;

public interface SharedModelRepository extends JpaRepository<SharedModel, String> {
}
