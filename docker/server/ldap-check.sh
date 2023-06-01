#!/bin/bash

echo "Checking LDAP server..."

until [ "$(ldapsearch -H ldap://172.17.0.1:10389 -b "ou=users,dc=webpdf,dc=de" -x "(objectclass=*)" -D "uid=admin,ou=users,dc=webpdf,dc=de" -w "secret" | grep dn: | wc -l)" -gt 0 ]; do
  echo "Waiting for LDAP server start..."
  sleep 5
done
