# Changelog

## [0.19.0](https://github.com/zakodium/adonis-mongodb/compare/v0.18.1...v0.19.0) (2024-06-17)


### Features

* **Connection:** add an observer api on transaction ([#160](https://github.com/zakodium/adonis-mongodb/issues/160)) ([721fe35](https://github.com/zakodium/adonis-mongodb/commit/721fe354103fc53277d9fef1c92e5835fd3a22b8))

## [0.18.1](https://github.com/zakodium/adonis-mongodb/compare/v0.18.0...v0.18.1) (2023-11-10)


### Bug Fixes

* export `@computed` in typings and bound in Provider ([#155](https://github.com/zakodium/adonis-mongodb/issues/155)) ([3d136b9](https://github.com/zakodium/adonis-mongodb/commit/3d136b9c477d4cee9968e4a7f219573fbf60eb70))

## [0.18.0](https://github.com/zakodium/adonis-mongodb/compare/v0.17.0...v0.18.0) (2023-11-09)


### Features

* support `@computed` decorator ([#153](https://github.com/zakodium/adonis-mongodb/issues/153)) ([412af03](https://github.com/zakodium/adonis-mongodb/commit/412af036b3251c0a115ff7f2264ad853a7552f03))

## [0.17.0](https://github.com/zakodium/adonis-mongodb/compare/v0.16.0...v0.17.0) (2023-09-22)


### Features

* add `useTransaction` to BaseModel ([#151](https://github.com/zakodium/adonis-mongodb/issues/151)) ([92fa525](https://github.com/zakodium/adonis-mongodb/commit/92fa5250a445117f0d3d87bb825a6b42d4839bef))
* add `transaction` shortcut on Database
* add support for transaction options on Connection

## [0.16.0](https://github.com/zakodium/adonis-mongodb/compare/v0.15.0...v0.16.0) (2023-09-19)


### ⚠ BREAKING CHANGES

* `mongodb` was updated to v6. See the changelog at https://github.com/mongodb/node-mongodb-native/releases/tag/v6.0.0

### Features

* update dependencies ([#149](https://github.com/zakodium/adonis-mongodb/issues/149)) ([546051d](https://github.com/zakodium/adonis-mongodb/commit/546051dbdc5d29132e34f9dfdb6034ea637d8b2c))

## [0.15.0](https://github.com/zakodium/adonis-mongodb/compare/v0.14.4...v0.15.0) (2023-05-22)


### Features

* add `afterUpSuccess` method to migrations ([8e70e59](https://github.com/zakodium/adonis-mongodb/commit/8e70e593c99050ef10b91b771c00e005f78d3ebe))

## [0.14.4](https://github.com/zakodium/adonis-mongodb/compare/v0.14.3...v0.14.4) (2023-05-08)


### Bug Fixes

* publish on npm and GPR ([51c6370](https://github.com/zakodium/adonis-mongodb/commit/51c63704c3927de6d6efbfdd16f6934e11c64e2b))

## [0.14.3](https://github.com/zakodium/adonis-mongodb/compare/v0.14.2...v0.14.3) (2023-03-07)


### Bug Fixes

* set exit code to 1 if migration failed ([#140](https://github.com/zakodium/adonis-mongodb/issues/140)) ([f07017c](https://github.com/zakodium/adonis-mongodb/commit/f07017ca95cd87795dfc815ccbb8377f9884e94b))

## [0.14.2](https://github.com/zakodium/adonis-mongodb/compare/v0.14.1...v0.14.2) (2023-03-07)


### Bug Fixes

* find highest batch correctly ([#138](https://github.com/zakodium/adonis-mongodb/issues/138)) ([cffa673](https://github.com/zakodium/adonis-mongodb/commit/cffa6739cd2a5fb8f6da093643c975cc2141d7ee))

## [0.14.1](https://github.com/zakodium/adonis-mongodb/compare/v0.14.0...v0.14.1) (2023-03-06)


### Bug Fixes

* add "override" to migration template ([#132](https://github.com/zakodium/adonis-mongodb/issues/132)) ([d8f8dc7](https://github.com/zakodium/adonis-mongodb/commit/d8f8dc73efc0afd0a0e538052c4fec7ca9094527))
* ignore type declaration files in migrations directory ([#137](https://github.com/zakodium/adonis-mongodb/issues/137)) ([b7eda71](https://github.com/zakodium/adonis-mongodb/commit/b7eda718256c295ca3117f6ba16ef87db6e56c3c))

## [0.14.0](https://github.com/zakodium/adonis-mongodb/compare/v0.13.0...v0.14.0) (2023-02-13)


### ⚠ BREAKING CHANGES

* Drop support for Node.js 14.x and MongoDB 4.x

### Miscellaneous Chores

* update dependencies ([#129](https://github.com/zakodium/adonis-mongodb/issues/129)) ([9be758c](https://github.com/zakodium/adonis-mongodb/commit/9be758ca4b536467bf2cbdcefda24bd7e804372e))

## [0.13.0](https://www.github.com/zakodium/adonis-mongodb/compare/v0.12.0...v0.13.0) (2021-11-22)


### Features

* **migrations:** add dropIndex method ([16652d8](https://www.github.com/zakodium/adonis-mongodb/commit/16652d8c136758f9a8758fe3f0bc97917fcbf5fc))

## [0.12.0](https://www.github.com/zakodium/adonis-mongodb/compare/v0.11.0...v0.12.0) (2021-09-23)


### Features

* implement `model.$original` and `model.$attributes` ([952a139](https://www.github.com/zakodium/adonis-mongodb/commit/952a13904160b5cc163e8555f1c170182b766d44))
* improve custom inspect output ([7fb3a3e](https://www.github.com/zakodium/adonis-mongodb/commit/7fb3a3e7544e8e455437839e8f0d406acda2cbd2))


### Bug Fixes

* throw an error when user attempts to spread a model ([ffacaca](https://www.github.com/zakodium/adonis-mongodb/commit/ffacacad0c598cff59c4a63eaebdddb1cf967592))

## [0.11.0](https://www.github.com/zakodium/adonis-mongodb/compare/v0.10.6...v0.11.0) (2021-09-16)


### ⚠ BREAKING CHANGES

* It is no longer possible to pass explain to the query() method's driver options. Use the new `explain` method instead.
* It is no longer possible to pass sort, skip or limit to the query() method's driver options. Use the new `sort`, `sortBy`, `skip` and `limit` methods instead.

### Features

* add explain query method ([42491b5](https://www.github.com/zakodium/adonis-mongodb/commit/42491b59106aaf9748ead305cbfbda3b09acd068))
* add sort, sortBy, skip and limit query methods ([29cc49c](https://www.github.com/zakodium/adonis-mongodb/commit/29cc49c2011b4f5717674523d282d83e7c6e644c))
* implement $isPersisted, $isNew and $isLocal model properties ([4c7b36e](https://www.github.com/zakodium/adonis-mongodb/commit/4c7b36eb054163c7a7b78eb6dd63e5bea9b7e7cf))

### [0.10.6](https://www.github.com/zakodium/adonis-mongodb/compare/v0.10.5...v0.10.6) (2021-09-01)


### Bug Fixes

* correct types of MongodbModelAuthProvider ([#104](https://www.github.com/zakodium/adonis-mongodb/issues/104)) ([e913e53](https://www.github.com/zakodium/adonis-mongodb/commit/e913e5314ae01a2e53e5a60ae41bc86a1241fa7d))

### [0.10.5](https://www.github.com/zakodium/adonis-mongodb/compare/v0.10.4...v0.10.5) (2021-09-01)


### Bug Fixes

* update mongodb client to v4.1.1 ([#102](https://www.github.com/zakodium/adonis-mongodb/issues/102)) ([32edca2](https://www.github.com/zakodium/adonis-mongodb/commit/32edca2831d2eb21f77e312c3f2eaccf2bd64e71))

### [0.10.4](https://www.github.com/zakodium/adonis-mongodb/compare/v0.10.3...v0.10.4) (2021-07-20)


### Bug Fixes

* **typings:** make query filter optional ([#94](https://www.github.com/zakodium/adonis-mongodb/issues/94)) ([fc1c6f6](https://www.github.com/zakodium/adonis-mongodb/commit/fc1c6f61586fee88d02318375960ceefbba1bf07))

### [0.10.3](https://www.github.com/zakodium/adonis-mongodb/compare/v0.10.2...v0.10.3) (2021-07-19)


### Bug Fixes

* include src in distribution ([4fd53d4](https://www.github.com/zakodium/adonis-mongodb/commit/4fd53d414cd0353164d6cb9d3c23948f3ea7a72c))

### [0.10.2](https://www.github.com/zakodium/adonis-mongodb/compare/v0.10.1...v0.10.2) (2021-07-15)


### Bug Fixes

* correctly compute ModelAttributes type ([af9d775](https://www.github.com/zakodium/adonis-mongodb/commit/af9d775df7f1e655f27eeaf5e91ef8705d52a623))
* make `id` reference the type of `_id` ([8148481](https://www.github.com/zakodium/adonis-mongodb/commit/8148481b230e944aad5c99505a14ba496f9c4c41))

### [0.10.1](https://www.github.com/zakodium/adonis-mongodb/compare/v0.10.0...v0.10.1) (2021-07-14)


### Bug Fixes

* update mongodb to 4.0.0 and test on MongDB 5.0 too ([#87](https://www.github.com/zakodium/adonis-mongodb/issues/87)) ([d57f0d8](https://www.github.com/zakodium/adonis-mongodb/commit/d57f0d8030db56f6425a67940fd2b8f28f4203f5))

## [0.10.0](https://www.github.com/zakodium/adonis-mongodb/compare/v0.9.1...v0.10.0) (2021-07-14)


### ⚠ BREAKING CHANGES

* move ObjectId export to Zakodium/Mongodb/Odm
* rename isDirty to $isDirty
* move mongodb driver options to options.driverOptions
* The model API has been reworked to be closer to Lucid's.
* move count() method out of find result, make find() method return synchronously
* The MongoDB driver has been upgraded to version 4. Types are now included and many have changed.
* rename Model binding to Odm, and rename Model to BaseModel

### Features

* add model boot method and start working on field decorator ([18d41c9](https://www.github.com/zakodium/adonis-mongodb/commit/18d41c98afdfa6206d7f90f50ba5b520d3e32cf5))
* add model.$dirty ([d218456](https://www.github.com/zakodium/adonis-mongodb/commit/d218456adbbb7cb492b01184c3b3f9a17922a23d))
* allow to change the connection used in Model.getCollection ([16c4180](https://www.github.com/zakodium/adonis-mongodb/commit/16c4180f8357420eed7f55f17c5b4d5d4ebd34aa))
* expose model.$isDeleted ([39f01d3](https://www.github.com/zakodium/adonis-mongodb/commit/39f01d364ab4067227fb3e98f9edbe6f7f84df6d))
* make query filter optional, add query.count and query.distinct ([d7a65b1](https://www.github.com/zakodium/adonis-mongodb/commit/d7a65b17fa1577c21430762d0e4820c93e7b3839))
* rename Model binding to Odm, and rename Model to BaseModel ([0fa9da6](https://www.github.com/zakodium/adonis-mongodb/commit/0fa9da614ee9d2050dee380ade1ca0b4bc95abf0))
* sort find results by descending id by default ([d9162b3](https://www.github.com/zakodium/adonis-mongodb/commit/d9162b3cd5110210148d5c22a4755c64c5a3766a))
* upgrade mongodb driver to version 4 ([1e2e403](https://www.github.com/zakodium/adonis-mongodb/commit/1e2e4038fe447b5f9267379c2aa70b740b81afa4))


### Bug Fixes

* correct types and suppress unavoidable anys ([7d95cee](https://www.github.com/zakodium/adonis-mongodb/commit/7d95cee7bb88defdd3090a3bcae9aaf0648c993f))


### Code Refactoring

* move count() method out of find result, make find() method return synchronously ([cf07ae7](https://www.github.com/zakodium/adonis-mongodb/commit/cf07ae739cacb5e1d8a547b9a6a76cdc38129200))
* move mongodb driver options to options.driverOptions ([edb0587](https://www.github.com/zakodium/adonis-mongodb/commit/edb05871d375db2663d84381654505468792f64d))
* move ObjectId export to Zakodium/Mongodb/Odm ([093eef3](https://www.github.com/zakodium/adonis-mongodb/commit/093eef34799544aedc929837690409fbdbe38582))
* rename isDirty to $isDirty ([2a3bc6a](https://www.github.com/zakodium/adonis-mongodb/commit/2a3bc6aaa5005fa90e9cf6479d33ec166c98fa5b))
* rework model API ([4092ca6](https://www.github.com/zakodium/adonis-mongodb/commit/4092ca630367d43064aa4e1c340c3a062950e828))

### [0.9.1](https://www.github.com/zakodium/adonis-mongodb/compare/v0.9.0...v0.9.1) (2021-07-06)


### Bug Fixes

* implement workaround to allow closing and reopening connections ([48d3ad5](https://www.github.com/zakodium/adonis-mongodb/commit/48d3ad5634e6736e97fdd43309d8c284158b4ef5))

## [0.9.0](https://www.github.com/zakodium/adonis-mongodb/compare/v0.8.0...v0.9.0) (2021-06-30)


### ⚠ BREAKING CHANGES

* implement Connection manager
* rename DatabaseContract and add primaryConnectionName
* rename "default" config field to "connection"
* add Zakodium/ prefix to IoC binding names

### Features

* expose container binding types ([de33f9e](https://www.github.com/zakodium/adonis-mongodb/commit/de33f9edb5fa2bcabfc552e6bb37fbfa5e5eee8a))
* implement Database.connection method ([91b0686](https://www.github.com/zakodium/adonis-mongodb/commit/91b0686fa218c1c8f26b932c05ba5df8aa02c075))


### Bug Fixes

* treat model instances created from iterator as already saved ([#67](https://www.github.com/zakodium/adonis-mongodb/issues/67)) ([57474a9](https://www.github.com/zakodium/adonis-mongodb/commit/57474a96cd552a1a0c561361790ca0b20a06c136))


### Code Refactoring

* add Zakodium/ prefix to IoC binding names ([966a7a1](https://www.github.com/zakodium/adonis-mongodb/commit/966a7a10fd6b64ce583e70c1ddf7a048943e0f78))
* implement Connection manager ([749ccca](https://www.github.com/zakodium/adonis-mongodb/commit/749ccca1dc414a9f2a0b96c8eadcae679d93349c))
* rename "default" config field to "connection" ([bcfda31](https://www.github.com/zakodium/adonis-mongodb/commit/bcfda3151fb41cdc58ef7bef7ccf89772e9fa237))
* rename DatabaseContract and add primaryConnectionName ([5a1a914](https://www.github.com/zakodium/adonis-mongodb/commit/5a1a9148681946aad5715d2f5b79086b1bebf91e))

## [0.8.0](https://www.github.com/zakodium/adonis-mongodb/compare/v0.7.0...v0.8.0) (2021-06-15)


### Features

* do not cancel successful migrations ([#65](https://www.github.com/zakodium/adonis-mongodb/issues/65)) ([0b4fb92](https://www.github.com/zakodium/adonis-mongodb/commit/0b4fb928798e19c831f86ee1d26d59d5473fac75))

## [0.7.0](https://www.github.com/zakodium/adonis-mongodb/compare/v0.6.0...v0.7.0) (2021-04-27)


### ⚠ BREAKING CHANGES

* The module now depends on @adonisjs/auth v8

### Features

* bump @adonisjs/auth to version 8 ([#60](https://www.github.com/zakodium/adonis-mongodb/issues/60)) ([de23012](https://www.github.com/zakodium/adonis-mongodb/commit/de230126e50637516363302e0e28bf7d32ba0a44))

## [0.6.0](https://www.github.com/zakodium/adonis-mongodb/compare/v0.5.0...v0.6.0) (2021-03-23)


### Bug Fixes

* add toJSON method type ([#56](https://www.github.com/zakodium/adonis-mongodb/issues/56)) ([a570ac0](https://www.github.com/zakodium/adonis-mongodb/commit/a570ac00eefa9a35c46d1e74b719cd331cd5d0b5))
* update dependencies ([f52991e](https://www.github.com/zakodium/adonis-mongodb/commit/f52991edd2597e38d2e6c59b5fd4015fd856b00b))

## [0.5.0](https://www.github.com/zakodium/adonis-mongodb/compare/v0.4.1...v0.5.0) (2021-03-15)


### Features

* add a toJSON method on Models ([#54](https://www.github.com/zakodium/adonis-mongodb/issues/54)) ([1f0c199](https://www.github.com/zakodium/adonis-mongodb/commit/1f0c199cc3ba89b61b81b1f3af58fa3acefd9c9c))

### [0.4.1](https://www.github.com/zakodium/adonis-mongodb/compare/v0.4.0...v0.4.1) (2021-03-04)


### Bug Fixes

* do not put templates in subdirectories ([a7e2a34](https://www.github.com/zakodium/adonis-mongodb/commit/a7e2a34dd968ffb1bf72db27225b25f1535a9070))

## [0.4.0](https://www.github.com/zakodium/adonis-mongodb/compare/v0.3.6...v0.4.0) (2021-02-23)


### Features

* add authentication provider using model ([8fb56a7](https://www.github.com/zakodium/adonis-mongodb/commit/8fb56a7d0284f044d02341125565d336289047c7))


### Bug Fixes

* abort migration transaction in case of error ([#47](https://www.github.com/zakodium/adonis-mongodb/issues/47)) ([8a46ef1](https://www.github.com/zakodium/adonis-mongodb/commit/8a46ef14c62edbae9d2c7acacb538ca2f4dee0b8))
* correctly handle already running migrations in migrate command ([b6efc7c](https://www.github.com/zakodium/adonis-mongodb/commit/b6efc7ca0d092c144a571882b6593ebf7b6241b2))

### [0.3.6](https://www.github.com/zakodium/adonis-mongodb/compare/v0.3.5...v0.3.6) (2021-01-08)


### Bug Fixes

* remove peer dependency on adonis core ([fa35ba6](https://www.github.com/zakodium/adonis-mongodb/commit/fa35ba6a7149474d3a63df6abbf0b568565ce91b))

### [0.3.5](https://www.github.com/zakodium/adonis-mongodb/compare/v0.3.4...v0.3.5) (2020-11-02)


### Bug Fixes

* fix types ([#37](https://www.github.com/zakodium/adonis-mongodb/issues/37)) ([d66ff32](https://www.github.com/zakodium/adonis-mongodb/commit/d66ff3237b18b5cdaa81ceba3272520bdc0cbd75)), closes [#5](https://www.github.com/zakodium/adonis-mongodb/issues/5)

### [0.3.4](https://www.github.com/zakodium/adonis-mongodb/compare/v0.3.3...v0.3.4) (2020-10-14)


### Bug Fixes

* in-memory typescript keeps migrations as TS files ([#36](https://www.github.com/zakodium/adonis-mongodb/issues/36)) ([7f4fd20](https://www.github.com/zakodium/adonis-mongodb/commit/7f4fd20e4df965ed3eab9407065506ef9721c638))
* rename handle with run ([#34](https://www.github.com/zakodium/adonis-mongodb/issues/34)) ([70c1b53](https://www.github.com/zakodium/adonis-mongodb/commit/70c1b53428f4902ca61036c14dcaf3f21db5f665))

### [0.3.3](https://www.github.com/zakodium/adonis-mongodb/compare/v0.3.2...v0.3.3) (2020-10-14)


### Bug Fixes

* **migration:** correctly extract name from migrations and check for dups ([7c6dec1](https://www.github.com/zakodium/adonis-mongodb/commit/7c6dec1942c0f22096ad603b63f39451dc13ae5b))

### [0.3.2](https://github.com/zakodium/adonis-mongodb/compare/v0.3.1...v0.3.2) (2020-10-12)


### Bug Fixes

* allow custom IDs ([#26](https://github.com/zakodium/adonis-mongodb/issues/26)) ([7cd80c9](https://github.com/zakodium/adonis-mongodb/commit/7cd80c98a43866be4d97e00a32c7fe22851647e5))
* fix merge and fill method typings ([#28](https://github.com/zakodium/adonis-mongodb/issues/28)) ([97cf4db](https://github.com/zakodium/adonis-mongodb/commit/97cf4dbd3783590ac004929aca81d5677dc2cd6f))

## [0.3.1](https://github.com/zakodium/adonis-mongodb/compare/v0.3.0...v0.3.1) (2020-10-07)


### Features

* add merge and fill methods ([#23](https://github.com/zakodium/adonis-mongodb/issues/23)) ([0b9d3ef](https://github.com/zakodium/adonis-mongodb/commit/0b9d3ef80111b28010efaf24708415329fa4194b))
* support instantiating models before saving ([#17](https://github.com/zakodium/adonis-mongodb/issues/17)) ([25d194a](https://github.com/zakodium/adonis-mongodb/commit/25d194a26b7d19c1e498b46c79b6172bcb5e58f2))



# [0.3.0](https://github.com/zakodium/adonis-mongodb/compare/v0.2.2...v0.3.0) (2020-09-29)


### Features

* migrations paths can be configured in the config file ([#8](https://github.com/zakodium/adonis-mongodb/issues/8)) ([fb8934d](https://github.com/zakodium/adonis-mongodb/commit/fb8934d3a6e1ac7a334bcf244c5b3ed0ef1c9dd6))
* pass session on object instantiation ([#16](https://github.com/zakodium/adonis-mongodb/issues/16)) ([1395ba0](https://github.com/zakodium/adonis-mongodb/commit/1395ba0ac095a36818f84557afe7fce17c6caf25))



## [0.2.2](https://github.com/zakodium/adonis-mongodb/compare/v0.2.1...v0.2.2) (2020-09-09)


### Bug Fixes

* correct incremental id in AutoIncrementModel ([8a20201](https://github.com/zakodium/adonis-mongodb/commit/8a20201c1d86618c2f068304c2b109b5a86a33d6))
* do not create a config subfolder ([#4](https://github.com/zakodium/adonis-mongodb/issues/4)) ([a86e79b](https://github.com/zakodium/adonis-mongodb/commit/a86e79b4df34b97084e23204423d012e393432d0))
* show accurate information in status command ([6580db9](https://github.com/zakodium/adonis-mongodb/commit/6580db92bfa7a4c752cf39c2c084ad2d8b67b500))



## [0.2.1](https://github.com/zakodium/adonis-mongodb/compare/v0.2.0...v0.2.1) (2020-09-02)



# [0.2.0](https://github.com/zakodium/adonis-mongodb/compare/v0.1.7...v0.2.0) (2020-09-02)


### Bug Fixes

* correct migration batch number ([66af888](https://github.com/zakodium/adonis-mongodb/commit/66af8882011ec0b14e7567d66231ab14f4b7f50e))
* don't log description twice ([923048f](https://github.com/zakodium/adonis-mongodb/commit/923048f0963d1dc5f80c1dc9cca7760331a6bcea))
* only use transaction when creating indexes if collection does not exist ([94fa3fb](https://github.com/zakodium/adonis-mongodb/commit/94fa3fb7b69cf079f372f51813a5dbaf08b0bde0))
* use original type on id getter ([78317c1](https://github.com/zakodium/adonis-mongodb/commit/78317c12ea25c624e85b7deb094966c1e2f852c7))


### Features

* add command show migration status ([0ef66d2](https://github.com/zakodium/adonis-mongodb/commit/0ef66d2a31e5c9782f80383dd48ec72276b4eac1))
* add defer method to migration module ([ff7c60a](https://github.com/zakodium/adonis-mongodb/commit/ff7c60a89d0c92cedaba4c4e918fcfab6ee3e0a6))
* add incremental model ([e7574f6](https://github.com/zakodium/adonis-mongodb/commit/e7574f6bcd2b3840f1cd3c8f6d195d3ccd781e64))
* allow to add description to migration ([7c075e7](https://github.com/zakodium/adonis-mongodb/commit/7c075e77dde28a2c3337b27e7abbc7833a6af793))
* execute all pending migrations in one transaction ([1581854](https://github.com/zakodium/adonis-mongodb/commit/1581854a4b95dd285d6f3ac86002cf293511b2da))


* rename migrate command ([c6ce51b](https://github.com/zakodium/adonis-mongodb/commit/c6ce51bb281b408d3a6afde4ae2245ad96f6c5b9))


### BREAKING CHANGES

* do not convert to string in id getter
* Model is no longer a default export but a named export
* renamed the migrate command to match how lucid names migration commands



## [0.1.7](https://github.com/zakodium/adonis-mongodb/compare/v0.1.6...v0.1.7) (2020-04-14)



## [0.1.6](https://github.com/zakodium/adonis-mongodb/compare/v0.1.5...v0.1.6) (2020-01-13)


### Bug Fixes

* skip lib checks ([7fd8507](https://github.com/zakodium/adonis-mongodb/commit/7fd8507c85c45c2c2bdbe1e6ac9be5b0114dc233))
* **commands:** inject db in handle method ([303fdf1](https://github.com/zakodium/adonis-mongodb/commit/303fdf17b6381050859380ba473ebfab49903528))



## [0.1.5](https://github.com/zakodium/adonis-mongodb/compare/v0.1.4...v0.1.5) (2019-12-06)


### Bug Fixes

* actually execute the up() method ([3d8740f](https://github.com/zakodium/adonis-mongodb/commit/3d8740f4c380086818c5fe888d2bbeb1f01d4e8a))



## [0.1.4](https://github.com/zakodium/adonis-mongodb/compare/v0.1.3...v0.1.4) (2019-12-03)


### Bug Fixes

* enable emitDecoratorMetadata ([407554e](https://github.com/zakodium/adonis-mongodb/commit/407554e579197b52f16621ddd062668840407f07))



## [0.1.3](https://github.com/zakodium/adonis-mongodb/compare/v0.1.2...v0.1.3) (2019-12-03)


### Bug Fixes

* transpile optional properties ([d22d8d1](https://github.com/zakodium/adonis-mongodb/commit/d22d8d15981a33eb9c0928574e7f0c36e18a9c6b))



## [0.1.2](https://github.com/zakodium/adonis-mongodb/compare/v0.1.1...v0.1.2) (2019-12-03)


### Bug Fixes

* really correctly read templates ([ad4c812](https://github.com/zakodium/adonis-mongodb/commit/ad4c81217b8b51196aa8da72f11f35e7a0d02f02))



## [0.1.1](https://github.com/zakodium/adonis-mongodb/compare/v0.1.0...v0.1.1) (2019-12-03)


### Bug Fixes

* correctly refer to template directory ([dab86ad](https://github.com/zakodium/adonis-mongodb/commit/dab86ad199d5a7c9b9dc825035dad2875410b0d7))



# 0.1.0 (2019-12-03)


### Bug Fixes

* rename types from .d.ts to .ts ([4a0cd71](https://github.com/zakodium/adonis-mongodb/commit/4a0cd7179e52fb49c28a49e9ac8781afc0f7335e))


### Features

* initial library ([6c917cf](https://github.com/zakodium/adonis-mongodb/commit/6c917cf8bb76c01ba02ed90036c293f0667f6d81))
