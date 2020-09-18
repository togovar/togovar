# TogoVar

TogoVar (NBDC's integrated database of Japanese genomic variation) is a database that has collected and organized genome 
sequence differences between individuals (variants) in the Japanese population and disease information associated with 
them.

## Docker

See [togovar-docker](https://github.com/togovar/togovar-docker) for details.

## Prerequisites

* ruby 2.7
* node.js v12.x (LTS)
    - yarn

## Configuration

## Development

### Backend

1. First install dependencies:

    ```sh
    $ bundle install
    ```

1. Start development server on `localhost:3000`

    ```sh
    $ rails server
    ```

### Frontend

1. First install dependencies:

    ```sh
    $ yarn install
    ```

1. Start development server on `localhost:8000`

    ```sh
    $ yarn start
    ```

Other commands

* Static code analysis for js and css

    ```sh
    $ yarn list
    ```

* Start production server

    ```sh
    $ start:production
    ```

* Build distribution files

    ```sh
    $ yarn build
    ```
