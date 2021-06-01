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

### Dotenv for development

```dotenv
# Frontend URL
TOGOVAR_FRONTEND_URL=https://togovar-stg.biosciencedbc.jp
# TogoStanza URL instead of relative URL `/stanza`
TOGOVAR_FRONTEND_STANZA_URL=https://togovar-stg.biosciencedbc.jp/stanza

# (Optional) if this is set, it will be passed to all stanzas as `ep`
TOGOVAR_STANZA_SPARQL_URL=https://togovar-stg.biosciencedbc.jp/sparql
# (Optional) if this is set, it will be passed to all stanzas as `sparqlist`
TOGOVAR_STANZA_SPARQLIST_URL=https://togovar-stg.biosciencedbc.jp/sparqlist
# (Optional) if this is set, it will be passed to stanzas that require `search` parameter
TOGOVAR_STANZA_SEARCH_API_URL=https://togovar-stg.biosciencedbc.jp/search
# (Optional) if this is set, it will be passed to stanzas that require `jbrowse` parameter
TOGOVAR_STANZA_JBROWSE_URL=https://togovar-stg.biosciencedbc.jp/jbrowse
```

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
