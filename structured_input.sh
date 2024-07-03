#!/bin/bash

# Read JSON input from stdin
read -r json_input

# Use jq to parse JSON and extract values
name=
age=
city=

# Print extracted values
echo "Name: "
echo "Age: "
echo "City: "
