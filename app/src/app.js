'use strict'

// Express サーバ
// https://expressjs.com/en/starter/hello-world.html

import fs from 'fs'
import json from 'json5'
import express from 'express'
import * as helmet from 'helmet'
import multer from 'multer'
import cors from 'cors'
import basicAuth from 'express-basic-auth'

import diagnoseWagri from './routes/diagnose/wagri.js'
import diagnoseLocal from './routes/diagnose/local.js'

// multipart データのアップロード
// (http://expressjs.com/en/resources/middleware/multer.html)
const upload = multer({ dest: 'uploads/' })
const app = express()

// Basic 認証の設定
// 他のミドルウェアより先にロードすること！
const users = json.parse(fs.readFileSync('/opt/secret/auth/auth'))
const auth = basicAuth({
  users,
  challenge: true
})
app.use(auth)

// CORS の設定（筆ポリゴン用）
const corsOptions = {
  origin: 'https://habs.rad.naro.go.jp/',
  optionsSuccessStatus: 200
}
app.use(cors(corsOptions))

// セキュリティ対策：HTTPヘッダの設定
app.use(helmet.frameguard())
app.use(helmet.noSniff())
app.use(helmet.referrerPolicy())

// 静的ファイル提供の設定
app.use(express.static('public'))

// APIエンドポイントの設定
app.post('/api/diagnose/wagri', upload.array('images'), diagnoseWagri.post)
app.post('/api/diagnose/local', upload.array('images'), diagnoseLocal.post)

export { app }
