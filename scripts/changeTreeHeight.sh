#!/bin/bash
case $(sed --help 2>&1) in
  *GNU*) sed_i () { xargs sed -i "$@"; };;
  *) sed_i () { xargs sed -i '' "$@"; };;
esac

grep -l --exclude-dir={.git,node_modules,artifacts} -r "CHUNK_TREE_HEIGHT = [0-9]" . | sed_i "s/CHUNK_TREE_HEIGHT = [0-9]/CHUNK_TREE_HEIGHT = ${1}/g"
