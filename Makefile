.DEFAULT_GOAL := build
.PHONY: build

SHELL := /bin/bash
PATH := $(shell yarn bin):$(PATH)

test:
	jest

test-watch:
	jest --watch

# Test server

build-test-server:
	@tsc test/server/index.ts --esModuleInterop --outDir test/server/build

deploy-test-server: build-test-server
	@cd test/server && firebase deploy --only functions:backup

# Staging & production

build:
	@rm -rf lib
	@tsc
	@prettier "lib/**/*.[jt]s" --write --loglevel silent
	@cp {package.json,*.md} lib
	@rsync --archive --prune-empty-dirs --exclude '*.ts' --relative src/./ lib

publish: build
	cd lib && npm publish --access public
