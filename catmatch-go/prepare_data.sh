#!/bin/bash

jq -s . data.json > ../cats.json
minify ../cats.json -o ../cats.json
