#!/bin/bash

#####
#
# venv.sh - Create virtual environment for the project
#
# Author: Eric Broda, eric.broda@brodagroupsoftware.com, August 17, 2023
#
#####

if [ -z ${ROOT_DIR+x} ] ; then
    echo "Environment variables have not been set.  Run 'source bin/environment.sh'"
    exit 1
fi

function showHelp {
    echo " "
    echo "ERROR: $1"
    echo " "
    echo "Usage:"
    echo " "
    echo "    venv.sh "
    echo " "
}

# Select a python version.  Note: Streamlit does not seem
# to run on Mac using Python 3.11, so you can select
# your specific version of python to create your
# virtual environment:
WINDOWS_PYTHON="python.exe"

# You may need to update this to point to your version of Python
# MAC_LINUX_PYTHON="/usr/local/bin/python3.10"
MAC_LINUX_PYTHON="/opt/homebrew/bin/python3"

get_python_command() {
    if [[ "$OSTYPE" == "msys" ]]; then
        echo $WINDOWS_PYTHON
    else
        # echo "python3"
        echo "$MAC_LINUX_PYTHON"
    fi

}

# Create the virtual environment in server directory
VENV_DIR="$PROJECT_DIR/server/venv"

# Ensure ./server exists
mkdir -p "$(dirname "$VENV_DIR")"

if [[ ! -d "$VENV_DIR" ]]; then
    $(get_python_command) -m venv "$VENV_DIR"
fi