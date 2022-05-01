.DEFAULT_GOAL := build
.PHONY: build test

test:
	npx jest

test-watch:
	npx jest --watch

test-lib:
	node test/lib/commonjs.js
	npx ts-node test/lib/ts.ts

# Test projects

deploy-test-server:
	@cd test/server && npx firebase deploy

build-test-extension:
	@npx tsc test/extension/index.ts --esModuleInterop --outDir test/extension/build

deploy-test-extension: build-test-extension
	@cd test/extension && npx firebase deploy

# Staging & production

build:
	@rm -rf lib
	@npx tsc
	@npx prettier "lib/**/*.[jt]s" --write --loglevel silent
	@cp package.json lib
	@cp *.md lib
	@rsync --archive --prune-empty-dirs --exclude '*.ts' --relative src/./ lib

publish: build test-lib
	cd lib && npm publish --access public

publish-next: build
	cd lib && npm publish --access public --tag next

build-extension:
	@cd extension/functions && npm run build

publish-extension: build-extension
	@cd extension && firebase ext:dev:publish backupfire/backupfire-agent
