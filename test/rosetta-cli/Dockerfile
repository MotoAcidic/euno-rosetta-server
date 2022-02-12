# This dockerfile provides an image that installs the official Rosetta CLI
# https://github.com/coinbase/rosetta-cli

FROM golang
USER root

WORKDIR /data
ARG rootdatadir=/data
ARG version_tag=359cb2e7174917cd8d702da100d9f29297e70a97

ENV OFFLINE_HOST=eunopay_offline
ENV ONLINE_HOST=eunopay_online        
ENV OFFLINE_PORT=46463
ENV ONLINE_PORT=46462

RUN curl -sSfL https://raw.githubusercontent.com/coinbase/rosetta-cli/$version_tag/scripts/install.sh | sh -s

COPY test/rosetta-cli/docker-entrypoint.sh /data/docker-entrypoint.sh

ENTRYPOINT ["./docker-entrypoint.sh"]
