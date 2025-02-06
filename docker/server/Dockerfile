FROM softvisiondev/webpdf:10.0

USER root

RUN apt-get update && DEBIAN_FRONTEND=nointeractive apt-get install -y --no-install-recommends htop joe ldap-utils

COPY --chown=webpdf:webpdf run.sh /opt/webpdf/run.sh
COPY --chown=webpdf:webpdf ldap-check.sh /opt/webpdf/ldap-check.sh

RUN chmod +x /opt/webpdf/run.sh
RUN chmod +x /opt/webpdf/ldap-check.sh

ADD "conf/application.xml" /opt/webpdf/conf/application.xml
ADD "conf/server.xml" /opt/webpdf/conf/server.xml

ARG AZURE_TENANT_ID
ARG AZURE_CLIENT_ID
ARG AZURE_APPLICATION_ID

ARG AUTH0_TENANT_ID
ARG AUTH0_CLIENT_ID
ARG AUTH0_APPLICATION_ID

# set the Azure OAuth settings in 'conf/server.xml' if settings are available
RUN if [ ! -z "$AZURE_TENANT_ID" ] ; \
    then \
    sed -i "s@#azure_tenant_id#@${AZURE_TENANT_ID}@g" /opt/webpdf/conf/server.xml; \
    sed -i "s@#azure_client_id#@${AZURE_CLIENT_ID}@g" /opt/webpdf/conf/server.xml; \
    sed -i "s@#azure_application_id#@${AZURE_APPLICATION_ID}@g" /opt/webpdf/conf/server.xml; \
    fi

# set the AUTH0 OAuth settings in 'conf/server.xml' if settings are available
RUN if [ ! -z "$AUTH0_CLIENT_ID" ] ; \
    then \
    sed -i "s@#auth0_tenant_id#@${AUTH0_TENANT_ID}@g" /opt/webpdf/conf/server.xml; \
    sed -i "s@#auth0_client_id#@${AUTH0_CLIENT_ID}@g" /opt/webpdf/conf/server.xml; \
    sed -i "s@#auth0_application_id#@${AUTH0_APPLICATION_ID}@g" /opt/webpdf/conf/server.xml; \
    fi

# remove Azure OAuth from 'conf/server.xml' if no settings have been made
RUN if [ -z "$AZURE_TENANT_ID" ] ; \
    then \
    sed -i '/<!-- BOF AZURE OAUTH -->/,/<!-- EOF AZURE OAUTH -->/d' /opt/webpdf/conf/server.xml; \
    fi

# remove Auth0 OAuth from 'conf/server.xml' if no settings have been made
RUN if [ -z "$AUTH0_CLIENT_ID" ] ; \
    then \
    sed -i '/<!-- BOF AUTH0 OAUTH -->/,/<!-- EOF AUTH0 OAUTH -->/d' /opt/webpdf/conf/server.xml; \
    fi

CMD [ "/opt/webpdf/run.sh" ]
