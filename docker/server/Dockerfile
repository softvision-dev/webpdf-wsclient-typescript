FROM softvisiondev/webpdf:9.0

USER root

RUN DEBIAN_FRONTEND=nointeractive apt-get install -y --no-install-recommends htop joe ldap-utils tinyproxy

ADD run.sh /opt/webpdf/run.sh
ADD ldap-check.sh /opt/webpdf/ldap-check.sh
RUN chmod +x /opt/webpdf/ldap-check.sh

ADD "conf/application.xml" /opt/webpdf/conf/application.xml
ADD "conf/server.xml" /opt/webpdf/conf/server.xml
ADD resources/tinyproxy.conf /etc/tinyproxy/tinyproxy.conf

CMD [ "/opt/webpdf/run.sh" ]
