# Adonis MongoDB

[![NPM version][npm-image]][npm-url]
[![build status][ci-image]][ci-url]
[![npm download][download-image]][download-url]

MongoDB provider for AdonisJs.

## Prerequisites

We recommend using mongodb 4.4, because creation of collections and indices in migrations will be transactional and will be properly rolled back in case of error.

If you use a version < 4.4, you might run into issues with partially applied migrations.

## Installation

```console
npm i @zakodium/adonis-mongodb
node ace invoke @zakodium/adonis-mongodb
```

## Usage

TODO

## Configuration

TODO

## Tests

To run tests locally:

```bash
$ docker-compose up -d
$ npm test
$ docker-compose down
```

## License

[MIT](./LICENSE)

[npm-image]: https://img.shields.io/npm/v/@zakodium/adonis-mongodb.svg
[npm-url]: https://www.npmjs.com/package/@zakodium/adonis-mongodb
[ci-image]: https://github.com/zakodium/adonis-mongodb/workflows/Node.js%20CI/badge.svg?branch=master
[ci-url]: https://github.com/zakodium/adonis-mongodb/actions?query=workflow%3A%22Node.js+CI%22
[download-image]: https://img.shields.io/npm/dm/@zakodium/adonis-mongodb.svg
[download-url]: https://www.npmjs.com/package/@zakodium/adonis-mongodb
