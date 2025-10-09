package main

import (
	"forum/internal/service"
)

func main() {
	service.InitDependencies()
	service.StartServer()
}
