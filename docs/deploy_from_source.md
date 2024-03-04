# ソースコードの展開

ここでは、既存の Raspberry Pi OS にソースコードを展開して、うどんこ病識別装置として使用できるようにする方法を説明します。

## 目次

1. Docker Engine のインストール
1. Docker イメージ等のクリーンアップ設定
1. ソースコードの展開
1. Wi-Fi ルータの設定

## 用意するもの

* Raspbian (32-bit) をインストールした Raspberry Pi 4 Model B
* キーボード、マウス、ディスプレイ
* インターネット接続

## Docker Engine のインストール

最新版の Docker Engine をインストールします ([参照](https://docs.docker.com/engine/install/debian/#install-using-the-convenience-script))。

```console
$ curl -fsSL https://get.docker.com -o get-docker.sh
$ sudo sh get-docker.sh
```

デフォルトでは、`docker` コマンドを使うには root 権限が必要です。
ユーザを `docker` グループに追加して、権限昇格せずに `docker` コマンドを使用できるように設定します。

```console
# usermod -aG docker naro-rasppi
```

再起動して、変更を適用します。

```console
# systemctl reboot
```

## Docker イメージ等のクリーンアップ設定

電源プラグを抜いて可搬型識別装置を停止した場合、通常のシャットダウン時（`poweroff` 等のコマンドを使った場合）に実施される Docker の終了処理が行われず、不要なファイルが残ってしまう場合があります。

不要なファイルが蓄積するとストレージの空き容量が小さくなってしまうため、`cron` を利用して、Raspberry Pi の起動時にクリーンアップ処理を実施します。

1. 下記コマンドを実行して、`cron` ファイルを開きます。
    ```console
    $ crontab -e
    ```
1. `cron` ファイルに下記の行を追加します。
    ```
    @reboot /usr/bin/docker system prune --all --force
    ```

## ソースコードの展開

> ⚠️注意⚠️
> 
> ソースファイルの改行コードが `LF` 以外の場合、システムが正しく動作しない場合があります。
> 
> Linux 以外の OS (Windows など) では、`LF` 以外の改行コードに自動変換される場合がありますので、ご注意ください。

1. SCP 等を用いて、ソースコード (`naro_rasppi`) をサーバ上の任意の場所に展開します。
1. Docker コンテナの起動コマンドを実行し、識別 AI および Web サーバを起動します。
    ```console
    $ cd /path/to/naro_rasppi # ソースコードの展開先ディレクトリに移動
    $ docker compose up --build --detach
    ```
1. `curl` コマンドを使って、サーバが起動していることを確認します。
    ```console
    $ curl -v localhost
    *   Trying 127.0.0.1:80...
    * Connected to localhost (127.0.0.1) port 80 (#0)
    > GET / HTTP/1.1
    > Host: localhost
    > User-Agent: curl/7.88.1
    > Accept: */*
    >
    < HTTP/1.1 401 Unauthorized
    < X-Powered-By: Express
    < WWW-Authenticate: Basic
    < Content-Type: text/html; charset=utf-8
    < Content-Length: 0
    < ETag: W/"0-2jmj7l5rSw0yVb/vlWAYkK/YBwk"
    < Date: Wed, 21 Feb 2024 00:22:18 GMT
    < Connection: keep-alive
    < Keep-Alive: timeout=5
    <
    * Connection #0 to host localhost left intact
    ```

## Wi-Fi アクセスポイントの設定

Raspberry Pi を Wi-Fi アクセスポイントとして使用できるように設定します。

設定方法は、[Wi-Fi アクセスポイントの設定](./configure_wifi.md) をご参照ください。

## 動作確認

上記の設定をして Raspberry Pi を再起動すると、カボチャうどんこ病識別装置として使用できるようになります。

PC 等から装置に Wi-Fi 接続し、診断ができることをご確認ください。

装置の使い方は、[診断装置の使い方](./how_to_use.md) をご参照ください。

以上