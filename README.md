# graphql-cli-generate-fragments [![npm](https://img.shields.io/npm/v/graphql-cli-generate-fragments.svg?style=flat-square)](https://www.npmjs.com/package/graphql-cli-generate-fragments)

Generates GraphQL fragments for each type in the project schema.

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

## Fragments Usage and Examples

### Generated Fragments
There are three types of fragments outputted by `graphql-cli-generate-fragments`.

Given the schema:

```graphql

type User implements Node {
  id: ID!
  email: String!
  password: String!
  posts: [Post!]
}

type Post  {
  id: ID!
  createdAt: DateTime!
  updatedAt: DateTime!
  isPublished: Boolean!
  title: String!
  text: String!
  author: User!
}

```

The following fragments are generated:

```graphql

fragment User on User {
  id
  email
  password
  posts {
    ...PostNoNesting
  }
}

fragment Post on Post {
  id
  createdAt
  updatedAt
  isPublished
  title
  text
  author {
    ...UserNoNesting
  }
}

fragment UserNoNesting on User {
  id
  email
  password
}

fragment PostNoNesting on Post {
  id
  createdAt
  updatedAt
  isPublished
  title
  text
}

```

Notice that we generate `_NoNesting` fragments, which do not include relations. Post and User would be recursive otherwise. If there is a recursive fragment you will receive a `"Cannot spread fragment within itself"` error.

#### Deeply Nested Fragments
When there is no recursive nesting of fragments it can be useful to include all related types queries. `_DeepNesting` fragments are generated for this use.

Given the following schema:

```graphql

type User implements Node {
  id: ID!
  email: String!
  password: String!
  details: UserDetails!
}

type UserDetails {
  firstName: String!
  lastName: String!
  address: Address!
}

type Address {
  line1: String!
  line2: String
  county: String
  postcode: String!
}

```

The following is also generated:

```graphql

fragment UserDeepNesting on User {
  id
  email
  password
  details {
    ...UserDetails
  }
}

fragment UserDetailsDeepNesting on UserDetails {
  firstName
  lastName
  address {
    ...Address
  }
}

fragment AddressDeepNesting on Address {
  line1
  line2
  county
  postcode
}

```

### Use with Apollo Graphql Tag Loader

By using [`graphql-tag/loader`](https://github.com/apollographql/graphql-tag) with Webpack you can import fragments into `.graphql` files:

```graphql

#import "../generated/app.fragments.graphql"

query CurrentUser {
  currentUser {
    ...User
  }
}

```

or into javascript

```javascript

import { User } from "../generated/app.fragments.graphql"

const query = gql`
    query CurrentUser {
    currentUser {
      ...User
    }
  }

  ${User}

```

### Use with JS

If you are unable to use Webpack - fragments can be generated to javascript models (see below)

```javascript

import { User } from "../generated/app.fragments.js"

const query = gql`
    query CurrentUser {
    currentUser {
      ...User
    }
  }

  ${User}

```

## Available generators
The following generators are provided:

| Generator    | Purpose                                      |
| ------------ | -------------------------------------------- |
| graphql | Generates fragments for all types in schema  |
| js | Wraps the graphql and exports them for import in javascript  |


## `graphql-config` extensions

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
  <img src="https://img.shields.io/badge/built-with_♡-red.svg?style=for-the-badge"/><a href="https://github.com/develomark" target="-_blank"><img src="https://img.shields.io/badge/by-develomark-yellow.svg?style=for-the-badge"/></a>
</p>

