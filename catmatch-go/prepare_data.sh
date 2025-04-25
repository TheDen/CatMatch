#!/bin/bash

jq -s . data.json > web/cats.json
minify web/cats.json -o web/cats.json
