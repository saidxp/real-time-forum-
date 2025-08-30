local:
	@mkdir -p "./requirements/project/logs"
	@	: >> "./requirements/project/logs/internal_errors.log"
	@cd "./requirements/project" && go run .
up:
	@mkdir -p "./requirements/project/logs"
	@	: >> "./requirements/project/logs/internal_errors.log" 
	docker compose -f ./docker-compose.yml up -d

build:
	docker compose -f ./docker-compose.yml build

down:
	docker compose -f ./docker-compose.yml down

status:
	docker compose -f ./docker-compose.yml ps
	docker logs forum

enter:
	docker exec -it forum bash

clean: down
	docker image prune -af
	docker volume prune -f
	docker network prune -f

fclean: clean

re: clean up

.PHONY = clean fclean re test enter status down build up local

