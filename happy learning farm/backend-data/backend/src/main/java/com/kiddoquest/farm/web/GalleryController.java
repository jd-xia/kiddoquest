package com.kiddoquest.farm.web;

import java.time.Duration;
import java.util.List;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.kiddoquest.farm.gallery.GalleryService;
import com.kiddoquest.farm.web.FarmDtos.GalleryItem;
import com.kiddoquest.farm.web.FarmDtos.GalleryShare;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/gallery")
@Tag(name = "Gallery")
public class GalleryController {

    private final GalleryService gallery;

    public GalleryController(GalleryService gallery) {
        this.gallery = gallery;
    }

    @GetMapping
    @Operation(summary = "Everyone's shared pictures and 3D models for one Art Studio item. Open to guests.")
    public List<GalleryItem> list(@AuthenticationPrincipal Jwt jwt, @RequestParam String key) {
        return gallery.list(key, jwt == null ? null : jwt.getSubject());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Share one of this account's children's pictures or 3D models with everyone")
    public GalleryItem share(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody GalleryShare body) {
        return gallery.share(ChildController.owner(jwt), body);
    }

    @GetMapping("/{id}/model")
    @Operation(summary = "Download a shared 3D model. Open to guests.")
    public ResponseEntity<byte[]> model(@PathVariable String id) {
        byte[] data = gallery.model(id);
        MediaType type = data.length > 4 && data[0] == 'g' && data[1] == 'l' && data[2] == 'T' && data[3] == 'F'
                ? MediaType.parseMediaType("model/gltf-binary")
                : MediaType.parseMediaType("model/gltf+json");
        return ResponseEntity.ok().contentType(type).cacheControl(CacheControl.maxAge(Duration.ofDays(7)).cachePublic()).body(data);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Stop sharing one of this account's designs")
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        gallery.delete(ChildController.owner(jwt), id);
    }
}
