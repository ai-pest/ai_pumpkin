#!/bin/bash
#-*- encoding: utf-8 -*-

# Apache の再起動を妨げる PID ファイルを削除する
rm -f /run/apache/apache2.pid # https://stackoverflow.com/a/41295226/13301046
rm -f /var/run/apache2/apache2.pid # https://blog.paranoidpenguin.net/2017/09/downtime-due-to-apache-ah00060/

apache2ctl -D FOREGROUND &
PID1=$!
python3 -u /var/www/maff_ai/src/model/daemon.py &
PID2=$!

# コンテナ停止時は Apache を graceful stop する
# (https://httpd.apache.org/docs/2.4/stopping.html#gracefulstop)
# これが無いと、コンテナ内のプロセスは毎回 SIGKILL される
# (https://docs.docker.com/compose/faq/#why-do-my-services-take-10-seconds-to-recreate-or-stop)
trap "kill -SIGWINCH ${PID1} && kill -SIGTERM ${PID2}" SIGTERM

# RaspPi の電源投入後、最初のコンテナ起動時は TPU の初期化が必ず失敗する。
# （2回目以降のコンテナ起動時は、TPU初期化に成功する）
# そこで、python3 がエラー終了したら、コンテナ全体を終了する。
# docker-compose.yml で restart 設定をしているので、コンテナが再度立ち上がり、初期化に成功する。
# TODO: apache2ctl の終了ステータスも見る
wait $PID2
