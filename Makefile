all:
	docker-compose up --build

re:
	docker-compose down
	docker-compose up --build

db:
	docker-compose up --build db

backend:
	docker-compose up --build backend

daemon:
	docker-compose up --build -d

down:
	docker-compose down

clean:
	docker-compose down
	rm -rf ./db/data

.PHONY: all re db daemon down clean
