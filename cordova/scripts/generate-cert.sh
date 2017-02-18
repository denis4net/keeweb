#!/bin/sh
mkdir -p certs
pushd certs

openssl req  -nodes -new -x509  -keyout developer_key.pem -out developer_cert.pem
openssl pkcs12 -export -inkey developer_key.pem -in developer_cert.pem -out developer_key.p12

popd