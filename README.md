# TogoVar

TogoVar (NBDC's integrated database of Japanese genomic variation) is a database that has collected and organized genome 
sequence differences between individuals (variants) in the Japanese population and disease information associated with 
them.

## Docker

See [togovar-docker](https://github.com/togovar/togovar-docker) for details.

## Prerequisites

* ruby 2.7
* node.js v12.x (LTS)

## Configuration

## Development

### Backend

1. First install dependencies:

    ```sh
    bundle install
    ```

1. Start development server on `localhost:3000`

    ```sh
    rails server
    ```

### Frontend

1. First install dependencies:

    ```sh
    yarn install
    ```

1. Start development server on `localhost:8080`

    ```sh
    yarn start
    ```

If you would like to create a development build

```sh
yarn build:dev
```
