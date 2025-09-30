package service

import (
	repo "forum/internal/repository"
	"html/template"
)

func InitTemplate(path string) {
	temp, err := template.ParseGlob(path)
	repo.GLOBAL_TEMPLATE = template.Must(temp, err)
}
