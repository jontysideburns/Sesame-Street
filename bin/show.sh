#!/bin/bash

#####
#
# show.sh - Show common environment variables
#
# Author: Eric Broda, eric.broda@brodagroupsoftware.com, August 17, 2023
#
#####

# Show the environment
echo "--- Environment ---"
echo "USER_NAME:          $USER_NAME"
echo "HOME_DIR:           $HOME_DIR"
echo "DOCKER_USERNAME:    $DOCKER_USERNAME"
echo "DOCKER_TOKEN:       ****"
echo "ROOT_DIR:           $ROOT_DIR"
echo "PROJECT:            $PROJECT"
echo "PROJECT_DIR:        $PROJECT_DIR"

if [[ ! -z ${OPENAI_API_KEY+x} ]] ; then
    echo "OPENAI_API_KEY:     ****"
fi
