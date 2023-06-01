#!/bin/bash
set -e

echo "Starting up ApacheDS..."
cd /ldap
java -jar ldap-server.jar --port $PORT users.ldif |& tee >(tail >log.txt)
