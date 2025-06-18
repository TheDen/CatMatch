.DEFAULT_GOAL := help
BINARY_NAME=catmatch
LDFLAGS=-s -w

PKG= github.com/TheDen/catmatch

# Dynamically set version and commit using git
VERSION := $(shell git describe --tags --abbrev=0)
COMMIT := $(shell git rev-parse --short HEAD)

# Append -X flags to LDFLAGS
LDFLAGS += -X '$(PKG).version=$(VERSION)' -X '$(PKG).commit=$(COMMIT)'

help: ## Prints the help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
    sort | \
    awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

typos: ## Runs typos on the codebase
	# https://github.com/crate-ci/typos
	@printf "%s\n" "==== Running typos ====="
	typos --exclude  pds-documents/

lint: typos go-vet go-staticcheck gosec ## Runs all the linters

format: format-go golines-format ## Runs all the formatters

documentation: markdown-toc ## Generates the documentation

format-lint: format lint ## Runs all the formatters and linters

mod: ## Runs go mod tidy, vendor, and verify
	go mod tidy
	go mod vendor
	go mod verify

go-update: ## Updates all the go dependencies
	go list -mod=readonly -m -f '{{if not .Indirect}}{{if not .Main}}{{.Path}}{{end}}{{end}}' all | xargs go get -u
	$(MAKE) mod

gosec: ## Runs gosec on the codebase
	# https://github.com/securego/gosec
	gosec -severity high -exclude-dir ./vendor/ ./...

format-go: ## Runs go-fmt on the codebase
	@printf "%s\n" "==== Running go-fmt ====="
	gofmt -s -w  *.go

golines-format: ## Runs golines on the codebase
	# https://github.com/segmentio/golines
	@printf "%s\n" "==== Run golines ====="
	golines --write-output --ignored-dirs=vendor .

go-vet: ## Runs go vet on the codebase
	@printf "%s\n" "==== Running go vet ====="
	go vet ./...

go-staticcheck: ## Runs staticcheck on the codebase
	# https://github.com/dominikh/go-tools
	staticcheck ./...

run: ## Runs the binary
	go run main.go

build:
	go build -o bin/${BINARY_NAME} main.go

build-prod: format-lint ## Builds the binary for your current platform with production flags
	go build -ldflags="${LDFLAGS}" -o bin/${BINARY_NAME} main.go

clean: ## Cleans the build artifacts
	rm -rf bin/*

