FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /src
COPY pom.xml .
COPY src ./src
RUN mvn -q -DskipTests package && cp target/*-SNAPSHOT.jar /tmp/app.jar

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /tmp/app.jar /app/app.jar
EXPOSE 8081
ENV PORT=8081
HEALTHCHECK --interval=15s --timeout=5s --start-period=50s --retries=10 \
  CMD bash -c 'echo > /dev/tcp/127.0.0.1/$PORT'
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
