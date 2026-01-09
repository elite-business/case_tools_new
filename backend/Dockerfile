# Multi-stage build for Spring Boot application
FROM maven:3.9.5-eclipse-temurin-17 AS builder

# Set working directory
WORKDIR /app

# Copy pom.xml first for dependency caching
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build
COPY src ./src
RUN mvn clean package -DskipTests -B

# Production stage
FROM eclipse-temurin:17-jre-alpine

# Create app user for security
RUN addgroup -g 1000 appgroup && adduser -u 1000 -G appgroup -s /bin/sh -D appuser

# Install curl for health checks
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy JAR from builder stage
COPY --from=builder /app/target/*.jar app.jar

# Create logs directory
RUN mkdir -p logs && chown -R appuser:appgroup /app

# Switch to app user
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8080/api/actuator/health || exit 1

# JVM options for production
ENV JAVA_OPTS="-Xmx1024m -Xms512m -XX:+UseG1GC -XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

# Run application
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]