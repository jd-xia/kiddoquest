package com.kiddoquest.farm.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** The 3D model (.glb or .gltf) of a shared_art row, same id. Kept apart so gallery lists stay small. */
@Entity
@Table(name = "shared_model")
public class SharedModel {

    @Id
    @Column(length = 36)
    private String id;

    @Column(nullable = false, columnDefinition = "LONGBLOB")
    private byte[] data;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public byte[] getData() {
        return data;
    }

    public void setData(byte[] data) {
        this.data = data;
    }
}
