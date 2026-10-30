package com.kiddoquest.farm.repo;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.kiddoquest.farm.domain.FarmMessage;

public interface FarmMessageRepository extends JpaRepository<FarmMessage, String> {

    @Query("select m from FarmMessage m where m.room = :room order by m.createdAt desc")
    List<FarmMessage> latest(@Param("room") String room, Pageable page);

    @Modifying
    @Query("delete from FarmMessage m where m.fromUsername = :name or m.room like :room")
    void clearUser(@Param("name") String name, @Param("room") String room);
}
