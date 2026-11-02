package com.kiddoquest.farm.repo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.kiddoquest.farm.domain.BrainProgress;

public interface BrainProgressRepository extends JpaRepository<BrainProgress, String> {

    List<BrainProgress> findByChildIdOrderByTopicIdAscLevelIdAsc(String childId);

    Optional<BrainProgress> findByChildIdAndTopicIdAndLevelId(String childId, String topicId, String levelId);

    void deleteByChildId(String childId);
}
