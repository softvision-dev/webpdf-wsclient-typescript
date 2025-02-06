FROM openjdk:11-jre-slim-buster

RUN set -x && apt-get update && DEBIAN_FRONTEND=nointeractive apt-get install -y --no-install-recommends \
  openssl dumb-init procps wget htop joe ldap-utils

ENV PORT 10389

RUN mkdir /ldap
WORKDIR /ldap

ADD resources /ldap
ADD certificates /ldap

RUN cd /ldap
RUN chmod +x start.sh

EXPOSE $PORT

CMD ["/ldap/start.sh"]
