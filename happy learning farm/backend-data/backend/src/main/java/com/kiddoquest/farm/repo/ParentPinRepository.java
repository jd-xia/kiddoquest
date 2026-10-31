package com.kiddoquest.farm.repo;

import org.springframework.data.jpa.repository.JpaRepository;

import com.kiddoquest.farm.domain.ParentPin;

public interface ParentPinRepository extends JpaRepository<ParentPin, String> {
}
