test:
	npm test

setup:
	npm ci

lint:
	npx eslint .

lint-fix:
	npx eslint --fix .

coverage:
	npm run coverage

dependencies:
	npm install