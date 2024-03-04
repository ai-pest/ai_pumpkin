#-*- encoding: utf-8 -*-

# 可搬型病虫害識別装置
# 識別AI・Web API イメージ

FROM debian:bullseye-20230227

ARG DEBIAN_FRONTEND=noninteractive
ARG TZ=Asia/Tokyo

# TZ の設定
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime \
    && echo $TZ \
        > /etc/timezone

# 各種ライブラリのインストール
RUN apt update && \
    apt install --yes \
        apache2 \
        libapache2-mod-wsgi-py3 \
        ca-certificates \
        curl \
        gnupg \
        python3 \
        python3-pip \
        zlib1g-dev \
        libopenjp2-7 \
	libatlas-base-dev

# PyCoral のセットアップ
# https://coral.ai/software/#debian-packages
RUN echo "deb https://packages.cloud.google.com/apt coral-edgetpu-stable main" \
    >> /etc/apt/sources.list.d/coral-edgetpu.list
RUN curl https://packages.cloud.google.com/apt/doc/apt-key.gpg \
    | apt-key add -
RUN apt-get update && \
    echo "libedgetpu1-max libedgetpu/accepted-eula boolean true" \
        | debconf-set-selections && \
    apt-get install --yes \
        libedgetpu1-max=16.0 \
        python3-pycoral=2.0.0 \
        python3-tflite-runtime=2.5.0.post1

# Python とライブラリのインストール
#   Pillow: zlib1g-dev, libopenjp2-7
#   tflite-runtime: libatlas-base-dev (NumPy dependency)
COPY build/requirements.txt /opt/build/requirements.txt
RUN python3 -m pip install \
    --extra-index-url https://www.piwheels.org/simple \
    --requirement /opt/build/requirements.txt

# Apache / WSGI の設定
COPY build/etc/apache2/sites-available/* /etc/apache2/sites-available/
COPY build/etc/apache2/mods-available/* /etc/apache2/mods-available/
COPY build/etc/apache2/conf-available/* /etc/apache2/conf-available/
COPY build/etc/apache2/apache2.conf /etc/apache2/apache2.conf
COPY build/etc/apache2/envvars /etc/apache2/

# 診断AIデーモンの実行権限設定
RUN adduser --disabled-password --gecos "" diagnose-ai
RUN groupadd ai-and-server
RUN usermod --append --groups ai-and-server diagnose-ai
RUN usermod --append --groups ai-and-server www-data
# (推論デーモンに Coral TPU への接続権限を与える)
RUN usermod --append --groups plugdev diagnose-ai
RUN mkdir --parents --mode=770 \
    /var/www/maff_ai/htdocs/tmpImage \
    /var/www/maff_ai/htdocs/resultImage
RUN chgrp ai-and-server \
    /var/www/maff_ai/htdocs/tmpImage \
    /var/www/maff_ai/htdocs/resultImage

# ソースのコピーとディレクトリ作成
COPY src /var/www/maff_ai/src
RUN mkdir --mode=700 /var/www/maff_ai/log
RUN chown www-data /var/www/maff_ai/log

# python3 -u: Disable Python buffer
# https://www.reddit.com/r/docker/comments/gk262t/comment/fqos8j8
CMD ["bash", "/var/www/maff_ai/src/main.sh"]

