# Build Stage
FROM golang:1.24.3 AS builder
WORKDIR /app/project
COPY ./project/. ./
RUN go build -o forum main.go

FROM debian:stable-slim
RUN apt-get update && apt-get upgrade -y
WORKDIR /project

COPY --from=builder /app/project/forum     .

EXPOSE 8080

CMD ["./forum"]
