package com.elite.casetools.converter;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.extern.slf4j.Slf4j;
import org.postgresql.util.PGobject;

import java.sql.SQLException;

/**
 * JPA converter for PostgreSQL JSONB columns
 * Handles conversion between Java objects and PostgreSQL JSONB type
 */
@Converter
@Slf4j
public class JsonbConverter implements AttributeConverter<Object, PGobject> {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public PGobject convertToDatabaseColumn(Object attribute) {
        if (attribute == null) {
            return null;
        }

        try {
            PGobject pgObject = new PGobject();
            pgObject.setType("jsonb");
            pgObject.setValue(objectMapper.writeValueAsString(attribute));
            return pgObject;
        } catch (SQLException | JsonProcessingException e) {
            log.error("Failed to convert object to JSONB", e);
            throw new IllegalArgumentException("Failed to convert object to JSONB", e);
        }
    }

    @Override
    public Object convertToEntityAttribute(PGobject dbData) {
        if (dbData == null || dbData.getValue() == null) {
            return null;
        }

        try {
            return objectMapper.readValue(dbData.getValue(), Object.class);
        } catch (JsonProcessingException e) {
            log.error("Failed to convert JSONB to object", e);
            return dbData.getValue();
        }
    }
}