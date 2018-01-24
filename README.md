# graphql-cli-generate-fragments [![npm]

## Installation

```npm i -g graphql-cli graphql-cli-generate-fragments```

## Usage
```
graphql generate-fragments

Generate Fragments for Graphql Schemas

Options:
  --dotenv         Path to .env file                                    [string]
  -p, --project    Project name                                         [string]
  --output, -o     Output folder                                        [string]
  --save, -s       Save settings to config file     [boolean] [default: "false"]
"false"]
  --generator, -g  Generate to 'js' or 'graphq'                 [string]
  --verbose        Show verbose output messages     [boolean] [default: "false"]
  -h, --help       Show help                                           [boolean]
  -v, --version    Show version number                                 [boolean]
```


### Graphql Fragments Generation
Creates graphql fragments containing the fields for each type in the supplied schema.



The first time you use fragment generation in your project, you need to provide an output folder for your fragments, and the generator you want to use:
```shell
$ graphql generate-fragments -p database -o src/generated -g graphql --save
✔ Fragments for project database written to src/generated/database.fragments.js
```
This will also save the configuration in your `.graphqlconfig` file (see below).

### Automating `graphql generate-fragments`
After you have set up fragment generation for all projects, you can simply run `graphql generate-fragments` without any parameters to process all projects:
```shell
$ graphql prepare
✔ Fragments for project app written to src/generated/app.fragments.graphql
✔ Fragments for project database written to src/generated/database.fragments.js
```
## Advanced topics

### Available generators
The following generators are provided:

| Generator    | Purpose                                      |
| ------------ | -------------------------------------------- |
| graphql | Generates fragments for all types in schema  |
| js | Wraps the graphql and exports them for inclusion in javascript projects  |


### `graphql-config` extensions

To store the project configuration for fragment generation, `graphql-cli-generate-fragments` uses two extension keys in the `graphql-config` configuration file. These keys can be set manually, or using the `--save` parameter.
```diff
# ./.graphqlconfig.yml
projects:
  app:
    schemaPath: src/schema.graphql
    extensions:
      endpoints:
        default: 'http://localhost:4000'
+       prepare-bundle: 
+         src/generated/app.fragments.js
+         generator: js
  database:
    schemaPath: src/generated/prisma.graphql
    extensions:
      prisma: database/prisma.yml
+     generate-fragments:
+       output: src/generated/database.fragments.graphql
+       generator: graphql

```

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

* [lachenmayer](https://github.com/lachenmayer) for [`graphql-fragment-codegen`](https://github.com/lachenmayer/graphql-fragment-codegen)
* [kbrandwijk](https://github.com/kbrandwijk)/[supergraphql](https://github.com/supergraphql) for [`graphql-cli-prepare`](https://github.com/supergraphql/graphql-cli-prepare)

<hr>
<p align="center">
  <img src="https://img.shields.io/badge/built-with_love-blue.svg?style=for-the-badge"/><a href="https://github.com/develomark" target="-_blank"><img src="https://img.shields.io/badge/by-develomark-red.svg?style=for-the-badge"/></a>
</p>

