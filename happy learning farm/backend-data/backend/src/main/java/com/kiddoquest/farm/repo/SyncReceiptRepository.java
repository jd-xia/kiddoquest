package com.kiddoquest.farm.repo;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.kiddoquest.farm.domain.SyncReceipt;

public interface SyncReceiptRepository extends JpaRepository<SyncReceipt, String> {

    Optional<SyncReceipt> findByChildIdAndIdempotencyKey(String childId, String idempotencyKey);

    void deleteByChildId(String childId);
}
